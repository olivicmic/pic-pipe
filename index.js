'use strict';

var AWS = require('aws-sdk'),
	Blue = require('bluebird'),
	chroma = require('chroma-js'),
	getPixels = require('get-pixels'),
	palette = require('get-rgba-palette'),
	sharp = require('sharp');

AWS.config.update({
	accessKeyId: process.env.S3_KEY,
	secretAccessKey: process.env.S3_SECRET,
	region: process.env.AWS_REGION
});

var bucErr = function (val) {
	var dot = '.';
	if (!val) dot = '';
	return new Error('input' + dot + val + ' not provided');
};

var s3Up = function (uploadObj, response) {
	var s3 = new AWS.S3();
	s3.putObject(uploadObj, function (err, data) {
		if (err) return response(err, null);
		return response(null, data);
	});
};

/**
 * Uploads objects with image buffer to S3.
 * 
 * @param {object} input - Main input object containing buffer and parameters.
 * @property {buffer} input.buffer - File buffer.
 * @property {string} input.name - A string with name of directory, filename, and extension.
 * @property {string} input.bucket - A string with the S3 bucket name.
 * @property {string} input.mimetype - A string with the file mimetype.
 * 
 * @callback {object} output - Output object containing an error or what was uploaded.
 * @param {object} err - Contains the error object if there is an error.
 * @param {object} input - Contains the initial input object with an added eTag property.
 * @property {string} input.eTag - A string that confirms valid upload.
 */
var bucketer = function (input, output) {
	if (!input.buffer || input.buffer.length <= 0) return output(bucErr('buffer'), null);
	else if (!input.name) return output(bucErr('name'), null);
	else if (!input.bucket) return output(bucErr('bucket'), null);
	else if (!input.mimetype) return output(bucErr('mimetype'), null);

	var s3Pic = {
		Body: input.buffer,
		Key: input.name,
		Bucket: input.bucket,
		ContentType: input.mimetype
	};

	s3Up(s3Pic, function (err, mainData) {
		if (err) {
			return output(err, null);
		}
		input.eTag = mainData.ETag;
		return output(null, input);
	});
};

var colorArrGen = function (input) {
	if (input.type === 'samples') {
		return palette(input.pixels.data, input.count).map(function (rgba) {
			return chroma(rgba)
				.saturate(0.33)
				.brighten(0.25)
				.hex()
				.slice(1);
		});
	} else if (input.type === 'average') {
		return palette(input.pixels.data, input.count, function (rgba) {
			return chroma(rgba).hsl();
		});
	}
};

/**
 * Takes key color from image and an average color.
 * 
 * @param  {object} input - Main input object containing buffer and parameters.
 * @property {buffer} input.buffer - Image buffer.
 * @property {string} input.mimetype - Image mimetype.
 * 
 * @callback  {object} output - Output object containing an error or colors sampled from image.
 * @param {object} err - Contains the error object if there is an error.
 * @param {object} input - Contains the initial input object with color properties.
 * @property {array} colors.picColors - An array with up to 9 color values a hex strings.
 * @property {array} colors.colorAverage - An Array with 3 numbers (0-255) for each RGB value.
 */
var colorPull = function (input, output) {
	getPixels(input.buffer, input.mimetype, function (err, pixels) {
		if (err) throw new Error(err);

		var picColors = colorArrGen({
			pixels: pixels,
			count: 9,
			type: 'samples'
		});
		var colorAverage = colorArrGen({
			pixels: pixels,
			count: 1,
			type: 'average'
		});
		input.picColors = picColors;
		input.colorAverage = colorAverage[0];
		return output(null, input);
	});
};

var resizer = function (input, output) {
	var resizeMethod,
		img = sharp(input.buffer),
		imgMetaScan = img.metadata(),
		fileSize = input.buffer.length;

	if (!input.maxByte) input.maxByte = 100000000;

	imgMetaScan
		.then(function (meta) {
			if (input.thumb === true) resizeMethod = img
				.resize(input.maxPixel, input.maxPixel)
				.rotate()
				.crop('center'); // thumbnail
			else if (fileSize <= input.maxByte) resizeMethod = img
				.rotate(); // undersized
			else if (meta.width > meta.height) resizeMethod = img
				.resize(input.maxPixel, null)
				.rotate(); // landscape
			else if (meta.height > meta.width) resizeMethod = img
				.resize(null, input.maxPixel)
				.rotate(); // portrait
			else resizeMethod = img
				.resize(input.maxPixel, input.maxPixel)
				.rotate(); // square

			resizeMethod
				.toBuffer(function (err, data) {
					if (err) return output(err, null);
					input.buffer = data;
					input.size = data.length;
					return output(null, input);
				});
		});
};

var resizeValidate = function (input, output) {
	if (!input) return output(bucErr(), null);
	else if (!input.buffer.length || input.buffer.length === 0) return output(bucErr('buffer'), null);
	else if (!input.maxPixel) return output(bucErr('maxPixel'), null);

	resizer(input, function (err, resized) {
		if (err) return output(err, null);
		return output(null, input);
	});
};

var jpgCompress = function (input, output) {
	return new Blue(function (resolve, reject) {
		if (!input.compressLevel) input.compressLevel = 1;
		var compressLevel = input.compressLevel * 10;
		sharp(input.buffer)
			.jpeg({ quality: compressLevel })
			.toBuffer(function (err, data) {
				if (err) reject(err);
				input.buffer = data;
				input.size = data.length;
				resolve(input);
			});
	});
};

var pngCompress = function (input, output) {
	var compressLevel = 5;
	if (input.buffer.size > input.maxPixel) {
		sharp(input.buffer)
			.png({ compressionLevel: compressLevel })
			.toBuffer(function (err, data) {
				if (err) return output(err, null);
				input.buffer = data;
				input.size = data.length;
				return output(null, input);
			});
	}
	return output(null, input);
};

var jpgLoop = function (input) {
	return new Blue(function (resolve, reject) {
		if (!input.compressLevel) {
			input.compressLevel = 10;
		}
		if (!input.compressTries) {
			input.compressTries = 5;
		}
		if ((input.buffer.length > input.maxByte) && (input.compressTries > 0)) {
			compress(input);
		} else {
			return resolve(input);
		}
		function compress(compressInput) {
			jpgCompress(compressInput)
				.then(function (compressed) {
					if ((compressed.buffer.length > compressed.maxByte) && (compressed.compressTries > 0)) {
						--compressed.compressTries;
						--compressed.compressLevel;
						compress(compressed);
					} else {
						resolve(compressed);
					}
				});
		}
	});
};

var imgJunction = function (input, output) {
	if (input.mimetype === ('image/jpeg' || 'image/jpg')) {
		jpgLoop(input).then(function (compressed) {
			return output(null, compressed);
		});
	} else if (input.mimetype === 'image/png') {
		pngCompress(input, function (err, compressed) {
			if (err) return output(err, null);
			return output(null, compressed);
		});
	}
};

/**
 * Resizes image proportionately or makes thumbnails.
 * 
 * @param  {object} input - Main input object containing buffer and parameters.
 * @property {buffer} input.buffer - Image buffer.
 * @property {string} input.mimetype - Image mimetype.
 * @property {number} input.maxPixel - Desired maximum dimension in pixels. Largest side will not exceed this size.
 * @property {number} input.maxByte - (Default: 100000000) File size in bytes over which resizing will occur.
 * @property {boolean} input.thumb - (Optional) if true, maxByte is ignored and a square thumb based on maxPixel.
 * 
 * @callback  {object} output: utilizes promises for asyncronous purposes. Use .then and .catch
 * @param {object} err - Contains the error object if there is an error.
 * @param {object} resized - Input object with with buffer replaced by resized buffer.
 * @property {buffer} resized.buffer - Resized mage buffer.
 * @property {number} resized.size - Size of new buffer.
 */
var resizeAndCompress = function (input) {
	if (!input.mimetype) throw new Error('mimetype not provided');
	return new Blue(function (resolve, reject) {
		resizeValidate(input, function (err, resized) {
			if (err) reject(err);
			else {
				input.buffer = resized.buffer;
				if (!input.thumb) { // not a thumb, or filesize too large
					imgJunction(input, function (err, compressed) {
						resolve(compressed);
					});
				}
				resolve(resized); // a thumb, or within filesize limit			
			}
		});
	});
};

exports.bucketer = bucketer;
exports.colorPull = colorPull;
exports.resizeAndCompress = resizeAndCompress;