'use strict';

var AWS = require('aws-sdk'),
	chroma = require('chroma-js'),
	getPixels = require('get-pixels-updated'),
	palette = require('get-rgba-palette'),
	sharp = require('sharp'),
	lal = require('lal');

AWS.config.update({
	accessKeyId: process.env.S3_KEY,
	secretAccessKey: process.env.S3_SECRET,
	region: process.env.AWS_REGION
});

const badBuffer = (input) => (!input || input.length <= 0 || !Buffer.isBuffer(input));

const picEval = (input, output) => {
	let errs = [];
	if (!input) return output({ message: 'No input provided' });
	if (badBuffer(input.buffer)) errs.push('buffer');
	if (!input.bucketEval && !input.maxPixel) errs.push('maxPixel');
	if (!input.mimetype) errs.push('mimetype');
	if (input.bucketEval && !input.name) errs.push('name');
	if (errs.length > 0) return output({
		message: `Pic-pipe input invalid/missing propert${(errs.length > 1) ? 'ies' : 'y'}: ${lal.arrayList(errs)}`
	});
	return output(null);
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

const s3Up = (input) => new Promise((s3Resolve, s3Reject) => {
	new AWS.S3().putObject(input, (err, data) => {
		if (err) s3Reject(err);
		s3Resolve(data);
	});
});

const bucketer = (input) => new Promise((bucketResolve, bucketReject) => {
	picEval({...input, bucketEval: true}, (errors) => {
		if (errors) bucketReject(Error(errors.message));
	});

	s3Up({
		Body: input.buffer,
		Key: input.name,
		Bucket: input.bucket,
		ContentType: input.mimetype
	})
		.then((mainData) => {
			input.eTag = mainData.ETag;
			bucketResolve(input);
		})
		.catch((err) => {
			if (err) return bucketReject(err);
		})
});

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
 * @property {string} colors.colorAverage - A hex color string.
 */
function colorPull(input, output) {
	getPixels(input.buffer, input.mimetype, (err, pixels) => {
		if (err) throw new Error(err);

		const picColors = colorArrGen({
			pixels: pixels,
			count: 10,
			type: 'samples'
		});
		const colorAverage = colorArrGen({
			pixels: pixels,
			count: 1,
			type: 'average'
		});

		return output(null, {
			picColors,
			colorAverage
		});
	});
}

function colorArrGen(input) {
	if (input.type === 'samples') {
		return palette(input.pixels.data, input.count).map((rgba) => {
			return chroma(rgba)
				.saturate(0.33)
				.brighten(0.25)
				.hex();
		});
	} else if (input.type === 'average') return chroma(palette(input.pixels.data, input.count)[0]).hex();
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

const resizeAndCompress = (input) => new Promise((resolve, reject) => {
	picEval(input, (errors) => {
		if (errors) reject(Error(errors.message));
	});
	resizer(input)
		.then((resized) => imgJunction(resized))
		.then((compressed) => resolve(compressed));
});

function resizer (input) { return new Promise((sizeResolve, sizeReject) => {
	var resizeMethod,
		img = sharp(input.buffer),
		imgMetaScan = img.metadata(),
		fileSize = input.buffer.length;

	if (!input.maxByte) input.maxByte = 100000000;
	imgMetaScan
		.then((meta) => {
			if (input.thumb === true) resizeMethod = img
				.resize(input.maxPixel, input.maxPixel)
				.rotate(); // thumbnail
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
				.toBuffer((err, data, info) => {
					if (err) sizeReject(err);
					sizeResolve({ ...input, buffer: data, size: info.size});
				});
		});
})};

function imgJunction (input) { return new Promise((juncResolve, juncReject) => {
	if (input.mimetype === ('image/jpeg' || 'image/jpg')) jpgLoop(input)
		.then((compressed) => juncResolve(compressed));
	else if (input.mimetype === 'image/png') pngCompress(input)
		.then((compressed) => juncResolve(compressed));
})};

function jpgLoop (input) { return new Promise((loopResolve, loopReject) => {
	if (!input.compressLevel) input.compressLevel = 10;
	if (!input.compressTries) input.compressTries = 5;
	if ((input.buffer.length > input.maxByte) && (input.compressTries > 0)) compress(input);
	else loopResolve(input);
	function compress (compressedInput) { return jpgCompress(compressedInput)
		.then((compressed) => {
			if ((compressed.buffer.length > compressed.maxByte) && (compressed.compressTries > 0)) {
				--compressed.compressTries;
				--compressed.compressLevel;
				compress(compressed);
			} else loopResolve(compressed);
		})};
})};

function jpgCompress (input) { return new Promise((jpgResolve, jpgReject) => {
	let compressLevel = input.compressLevel ? input.compressLevel * 10 : 1;
	sharp(input.buffer)
		.jpeg({ quality: compressLevel })
		.toBuffer((err, data, info) => {
			if (err) jpgReject(err);
			jpgResolve({ ...input, buffer: data, size: info.size});
		});
})};

function pngCompress (input) { return new Promise((pngResolve, pngReject) => {
	if (input.size > input.maxByte) {
		sharp(input.buffer)
			.png({
				compressionLevel: input.compressLevel ? input.compressLevel : 5
			})
			.toBuffer((err, data, info) => {
				if (err) pngReject(err);
				pngResolve({ ...input, buffer: data, size: info.size});
			});
	} else pngResolve(input)
})};

exports.bucketer = bucketer;
exports.colorPull = colorPull;
exports.resizeAndCompress = resizeAndCompress;
