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

var s3Up = function (uploadObj, response) {
	var s3 = new AWS.S3();
	s3.putObject(uploadObj, function (err, data) {
		if (err) {
			response(err, null);
		}
		response(null, data);
	});
};

var bucketer = function (input, output) {

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
		var uploaded = mainData;
		uploaded.Key = s3Pic.Key;
		uploaded.Bucket = s3Pic.Bucket;
		uploaded.ContentType = s3Pic.ContentType;
		return output(null, uploaded);
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

var colorPull = function (input, output) {
	getPixels(input.buffer, input.mimetype, function (err, pixels) {
		if (err) {
			throw new Error(err);
		}
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
		return output(null, {
			picColors: picColors,
			colorAverage: colorAverage[0]
		});
	});
};

var resizer = function (input, output) {
	const resizerError = new Error();
	if (!input) {
		resizerError.message = 'No input given to resizer.';
		output(resizerError, null);
	} else if (!input.buffer.length || input.buffer.length === 0) {
		resizerError.message = 'Undefined or empty buffer given to resizer.';
		output(resizerError, null);
	} else if (!input.maxPixel) {
		resizerError.message = 'maxPixel not given to resizer.';
		output(resizerError, null);
	} else {
		if (!input.maxByte) {
			input.maxByte = 104857600;
		}
		var	fileSize = input.buffer.length;
		const image = sharp(input.buffer);
		sharp(input.buffer)
			.metadata()
			.then(function (meta) {
				if (input.thumb === true) {
					image
						.resize(input.maxPixel, input.maxPixel)
						.rotate()
						.crop('center')
						.toBuffer(function (err, data) {
							if (err) {
								output(err, null);
							}
							input.buffer = data;
							input.size = data.length;
							return output(null, input);
						});
				} else if (fileSize <= input.maxByte) {
					image
						.rotate()
						.toBuffer(function (err, data) {
							input.buffer = data;
							input.size = data.length;
							return output(null, input);
						});
				} else if (meta.width > meta.height) {
					// landscape
					image
						.resize(input.maxPixel, null)
						.rotate()
						.toBuffer(function (err, data) {
							if (err) {
								return output(err, null);
							}
							input.buffer = data;
							input.size = data.length;
							return output(null, input);
						});
				} else if (meta.height > meta.width) {
					// portrait
					image
						.resize(null, input.maxPixel)
						.rotate()
						.toBuffer(function (err, data) {
							if (err) {
								return output(err, null);
							}
							input.buffer = data;
							input.size = data.length;
							return output(null, input);
						});
				} else {
					// square
					image
						.resize(input.maxPixel, input.maxPixel)
						.rotate()
						.toBuffer(function (err, data) {
							if (err) {
								return output(err, null);
							}
							input.buffer = data;
							input.size = data.length;
							return output(null, input);
						});
				}
			});
	}
};

var jpgCompress = function (input, output) {
	return new Blue(function (resolve, reject) {
		if (!input.compressLevel) {
			input.compressLevel = 1;
		}
		var compressLevel = input.compressLevel * 10;
		sharp(input.buffer)
			.jpeg({ quality: compressLevel })
			.toBuffer(function (err, data) {
				if (err) {
					reject(err);
				}
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
				if (err) {
					return output(err, null);
				}
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
			output(null, compressed);
		});
	} else if (input.mimetype === 'image/png') {
		pngCompress(input, function (err, compressed) {
			if (err) {
				output(err, null);
			}
			output(null, compressed);
		});
	}
};

var resizeAndCompress = function (input) {
	if (!input.mimetype) {
		throw new Error('mimetype not provided');
	}
	return new Blue(function (resolve, reject) {
		resizer(input, function (err, resized) {
			if (err) {
				reject(err);
			} else {
				input.buffer = resized.buffer;
				if (!input.thumb) { // not a thumb, or filesize too large
					imgJunction(input, function (err, compressed) {
						resolve(compressed);
					});
				} else { // a thumb, or within filesize limit
					resolve(resized);
				}
			}
		});
	});
};

exports.bucketer = bucketer;
exports.colorPull = colorPull;
exports.resizeAndCompress = resizeAndCompress;