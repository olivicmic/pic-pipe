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

var typeMsg = function (mime, format) {
	console.log('input type: ' + mime + ', output type: ' + format);
};

var orientMsg = function (type, width, height) {
	console.log('is ' + type + ' - width: ' + width + ', height: ' + height);
};

var picTest = function (options, done) {
	request.get(options.url, function (err, res, body) {

		var pic = {
			maxPixel: 2500,
			maxByte: 500000,
			compressTries: 5,
			compressLevel: 10,
			buffer: body,
			size: body.length
		}

		if (options.mime === 'jpeg') {
			pic.mimetype = 'image/jpeg';
		}
		if (options.mime === 'png') {
			pic.mimetype = 'image/png';
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

describe('#picPipe', function () {
	this.timeout(20000);

	// full size JPG tests
	it('should resize/compress large portrait JPG', function (done) {
		picTest({ url: largeJpgPort, orient: 'port', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should resize/compress large landscape JPG', function (done) {
		picTest({ url: largeJpgLand, orient: 'land', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should resize/compress large square JPG', function (done) {
		picTest({ url: largeJpgSqr, orient: 'square', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail JPG tests
	it('should thumbnail large portrait JPG', function (done) {
		picTest({ url: largeJpgPort, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail large landscape JPG', function (done) {
		picTest({ url: largeJpgLand, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail large square JPG', function (done) {
		picTest({ url: largeJpgSqr, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// full size PNG tests
	it('should resize/compress large portrait PNG', function (done) {
		picTest({ url: largePngPort, orient: 'port', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should resize/compress large landscape PNG', function (done) {
		picTest({ url: largePngLand, orient: 'land', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should resize/compress large square PNG', function (done) {
		picTest({ url: largePngSqr, orient: 'square', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail PNG tests
	it('should thumbnail large portrait PNG', function (done) {
		picTest({ url: largePngPort, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail large landscape PNG', function (done) {
		picTest({ url: largePngLand, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail large square PNG', function (done) {
		picTest({ url: largePngSqr, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	// Small JPGs - under byte limit and should not resize
	it('should not resize/compress small portrait JPG', function (done) {
		picTest({ url: smallJpgPort, orient: 'port', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should not resize/compress small landscape JPG', function (done) {
		picTest({ url: smallJpgLand, orient: 'land', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should not resize/compress small square JPG', function (done) {
		picTest({ url: smallJpgSqr, orient: 'square', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail small JPG tests
	it('should thumbnail small portrait JPG', function (done) {
		picTest({ url: smallJpgPort, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail small landscape JPG', function (done) {
		picTest({ url: smallJpgLand, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail small square JPG', function (done) {
		picTest({ url: smallJpgSqr, orient: 'thumb', mime: 'jpeg' }, function (complete) {
			done(complete);
		});
	});

	// Small PNGs - under byte limit and should not resize
	it('should not resize/compress small portrait PNG', function (done) {
		picTest({ url: smallPngPort, orient: 'port', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should not resize/compress small landscape PNG', function (done) {
		picTest({ url: smallPngLand, orient: 'land', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should not resize/compress small square PNG', function (done) {
		picTest({ url: smallPngSqr, orient: 'square', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	// thumbnail small PNG tests
	it('should thumbnail small portrait PNG', function (done) {
		picTest({ url: smallPngPort, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail small landscape PNG', function (done) {
		picTest({ url: smallPngLand, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

	it('should thumbnail small square PNG', function (done) {
		picTest({ url: smallPngSqr, orient: 'thumb', mime: 'png' }, function (complete) {
			done(complete);
		});
	});

});