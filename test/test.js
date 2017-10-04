'use strict';

const expect = require('chai').expect,
	picPipe = require('../index'),
	util = require('util'),
	sharp = require('sharp'),
	request = require('request').defaults({ encoding: null }),
	testLocation = 'http://pics.vics.pics/test-images/',
	largeJpgPort = testLocation + 'portrait-2448x3264.jpg',
	largeJpgLand = testLocation + 'landscape-3264x2448.jpg',
	largeJpgSqr = testLocation + 'square-2448x2448.jpg',
	largePngPort = testLocation + 'portrait-2448x3264.png',
	largePngLand = testLocation + 'landscape-3264x2448.png',
	largePngSqr = testLocation + 'square-2448x2448.png',
	smallJpgPort = testLocation + 'portrait-960x1280.jpg',
	smallJpgLand = testLocation + 'landscape-1280x960.jpg',
	smallJpgSqr = testLocation + 'square-1280x1280.jpg',
	smallPngPort = testLocation + 'portrait-480x640.png',
	smallPngLand = testLocation + 'landscape-640x480.png',
	smallPngSqr = testLocation + 'square-640x640.png';

var dateFormat = function () {
	var monthArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		time = new Date(),
		day = time.getDate(),
		mm = time.getMonth(),
		year = time.getFullYear(),
		hr = time.getHours(),
		min = time.getMinutes(),
		month = monthArr[mm];

	var clock = function () {
		if (hr >= 12) {
			var hour = hr - 12;
			return hour + '.' + min + 'PM';
		}
		return hr + '.' + min + 'AM';
	};
	return month + day + '_' + year + '_' + clock();
};

var typeMsg = function (mime, format) {
	console.log('input type: ' + mime + ', output type: ' + format);
};

var orientMsg = function (type, width, height) {
	console.log('is ' + type + ' - width: ' + width + ', height: ' + height);
};

var mimer = function (mime) {
	if (mime === 'jpeg' || mime === 'jpg') {
		return 'image/jpeg';
	}
	if (mime === 'png') {
		return 'image/png';
	}
	throw new Error('invalid mimetype');
};

var picTest = function (options, done) {
	request.get(options.url, function (err, res, body) {

		var pic = {
			maxPixel: 2500,
			maxByte: 500000,
			compressTries: 5,
			compressLevel: 10,
			buffer: body,
			size: body.length,
			mimetype: mimer(options.mime)
		}

		if (options.orient === 'thumb') {
			pic.maxPixel = 200;
			pic.thumb = true;
		}

		const originalSize = pic.size;
		console.log('original size: ' + originalSize);

		picPipe.resizeAndCompress(pic)
			.then(function (output) {
				console.log('new size: ' + output.buffer.length);
				if ((originalSize > pic.maxByte) || (options.orient === 'thumb')) {
					expect(output.buffer.length).to.be.below(originalSize);
				} else {
					expect(output.buffer.length).to.be.at.most(originalSize);
				}
				sharp(output.buffer)
					.metadata()
					.then(function (meta) {
						if (options.mime === 'jpeg') {
							typeMsg(options.mime, meta.format);
							expect(meta.format).to.equal(options.mime);
						}
						if (options.mime === 'png') {
							typeMsg(options.mime, meta.format);
							expect(meta.format).to.equal(options.mime);
						}
						if (options.orient === 'port') {
							console.log('max dimension: ' + pic.maxPixel);
							orientMsg(options.orient, meta.width, meta.height);
							expect(meta.height).to.be.at.most(pic.maxPixel);
							expect(meta.width).to.be.below(meta.height);
						}
						if (options.orient === 'land') {
							console.log('max dimension: ' + pic.maxPixel);
							orientMsg(options.orient, meta.width, meta.height);
							expect(meta.width).to.be.at.most(pic.maxPixel);
							expect(meta.height).to.be.below(meta.width);
						}
						if ((options.orient === 'square') || options.orient === 'thumb') {
							console.log('max dimension: ' + pic.maxPixel);
							orientMsg(options.orient, meta.width, meta.height);
							expect(meta.height).to.be.at.most(pic.maxPixel);
							expect(meta.width).to.be.at.most(pic.maxPixel);
							expect(meta.height).to.equal(meta.width);
						}
						done();
					});
			});
	});
};

var colorTest = function (options, done) {
	request.get(options.url, function (err, res, body) {
		var pic = {
			buffer: body,
			mimetype: mimer(options.mime)
		};
		picPipe.colorPull(pic, function (err, colors) {
			console.log('picColors:');
			console.log(colors.picColors);
			console.log('colorAverage:');
			console.log(colors.colorAverage);
			expect(colors.picColors.length).to.be.above(1);
			expect(colors.picColors.length).to.be.at.most(9);
			expect(colors.colorAverage.length).to.equal(3);
			done();
		});
	});
};


var bucketTest = function (options, done) {
	request.get(options.url, function (err, res, body) {
		var pic = {
			buffer: body,
			name: 'testing_dir/' + dateFormat() + '.' + options.mime,
			bucket: process.env.S3_BUCKET,
			mimetype: mimer(options.mime)
		};
		picPipe.bucketer(pic, function (err, uploaded) {
			console.log('uploaded:');
			console.log(uploaded);
			expect(uploaded).to.include.keys('ETag');
			done();
		});
	});
};

describe('#picPipe', function () {
	this.timeout(20000);

	var resizeComTxt = 'should resize/compress ';

	// full size JPG tests
	it(resizeComTxt + 'large portrait JPG', function (done) {
		picTest({ url: largeJpgPort, orient: 'port', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(resizeComTxt + 'large landscape JPG', function (done) {
		picTest({ url: largeJpgLand, orient: 'land', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(resizeComTxt + 'large square JPG', function (done) {
		picTest({ url: largeJpgSqr, orient: 'square', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// full size PNG tests
	it(resizeComTxt + 'large portrait PNG', function (done) {
		picTest({ url: largePngPort, orient: 'port', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(resizeComTxt + 'large landscape PNG', function (done) {
		picTest({ url: largePngLand, orient: 'land', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(resizeComTxt + 'large square PNG', function (done) {
		picTest({ url: largePngSqr, orient: 'square', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	var noComTxt = 'should not resize/compress ';

	// Small JPGs - under byte limit and should not resize
	it(noComTxt + 'small portrait JPG', function (done) {
		picTest({ url: smallJpgPort, orient: 'port', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(noComTxt + 'small landscape JPG', function (done) {
		picTest({ url: smallJpgLand, orient: 'land', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(noComTxt + 'small square JPG', function (done) {
		picTest({ url: smallJpgSqr, orient: 'square', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// Small PNGs - under byte limit and should not resize
	it(noComTxt + 'small portrait PNG', function (done) {
		picTest({ url: smallPngPort, orient: 'port', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(noComTxt + 'small landscape PNG', function (done) {
		picTest({ url: smallPngLand, orient: 'land', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(noComTxt + 'small square PNG', function (done) {
		picTest({ url: smallPngSqr, orient: 'square', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	var thumbTxt = 'should thumbnail ';

	// thumbnail large JPG tests
	it(thumbTxt + 'large portrait JPG', function (done) {
		picTest({ url: largeJpgPort, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'large landscape JPG', function (done) {
		picTest({ url: largeJpgLand, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'large square JPG', function (done) {
		picTest({ url: largeJpgSqr, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail large PNG tests
	it(thumbTxt + 'large portrait PNG', function (done) {
		picTest({ url: largePngPort, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'large landscape PNG', function (done) {
		picTest({ url: largePngLand, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'large square PNG', function (done) {
		picTest({ url: largePngSqr, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail small JPG tests
	it(thumbTxt + 'small portrait JPG', function (done) {
		picTest({ url: smallJpgPort, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'small landscape JPG', function (done) {
		picTest({ url: smallJpgLand, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'small square JPG', function (done) {
		picTest({ url: smallJpgSqr, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail small PNG tests
	it(thumbTxt + 'small portrait PNG', function (done) {
		picTest({ url: smallPngPort, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'small landscape PNG', function (done) {
		picTest({ url: smallPngLand, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(thumbTxt + 'small square PNG', function (done) {
		picTest({ url: smallPngSqr, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

 	var colorTxt = 'should return a set of colors and an average color from ';
 	// color extracting tests
	it(colorTxt + 'large jpg', function (done) {
		colorTest({ url: largeJpgSqr, mime: 'jpg' }, function (complete) {
			done(complete);
		});
	});

	it(colorTxt + 'large png', function (done) {
		colorTest({ url: largePngSqr, mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it(colorTxt + 'small jpg', function (done) {
		colorTest({ url: smallJpgSqr, mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it(colorTxt + 'small png', function (done) {
		colorTest({ url: smallPngSqr, mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	// S3 uploading test

	it('Should upload image to S3 returning an ETag', function (done) {
		bucketTest({ url: smallPngSqr, mime: 'png' }, function (complete) {
			done(complete);
		});
	});

});