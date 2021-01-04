'use strict';
const fs = require('fs'),
	expect = require('chai').expect,
	assert = require('chai').assert,
	picPipe = require('../index'),
	util = require('util'),
	lal = require('lal'),
	picTest = require('./PicTest'),
	colorTest = require('./ColorTest'),
	bucketTest = require('./BucketTest'),
	Testimages = require('./Testimages');

const typeMsg = (mime, format) => console.log('input type: ' + mime + ', output type: ' + format);
const orientMsg = (type, width, height) => console.log('is ' + type + ' - width: ' + width + ', height: ' + height);
const unique = lal.generateUnique();

const initTest = (input) => {
	let doTest = (input.mode === 'color') ? colorTest : picTest;
	it(input.message + ' ' + input.detail, (done) => {
		doTest({...input, unique: unique }, (complete) => {
			done(complete);
		});
	});
};

const imageSet = Testimages.makePaths({
	types: ['jpeg', 'png'],
	orient: ['portrait', 'landscape', 'square'],
	size: ['large', 'small']
});

describe('picPipe resize tests', function () {
	this.timeout(20000);
	imageSet.map((image, i) => initTest({
		...Testimages.makeOptions({file: image}),
		message: 'should resize/compress'
	}));
});

describe('thumbnail tests', function () {
	this.timeout(20000);
	imageSet.map((image, i) => initTest({
		...Testimages.makeOptions({file: image, orient: 'thumb'}),
		message: 'should thumbnail'
	}));

});

describe('Color extraction tests', function () {
	this.timeout(20000);
 	imageSet.map((image, i) => initTest({
		...Testimages.makeOptions({file: image}),
		message: 'should return a set of colors and an average color from',
		mode: 'color'
	}));

});

describe('Uploading tests', function () {
	this.timeout(20000);
	it('Should upload image to S3 returning an ETag', (done) => {
		bucketTest(Testimages.makeOptions({file: imageSet[0]}), (complete) => {
			console.log('\x07');
			done(complete);
		});
	});
});

describe('error tests', function () {
	this.timeout(20000);
	it('Should error with non-buffer', (done) => {
		picPipe.resizeAndCompress({
			buffer: 'nothing',
			thumb: true,
			maxPixel: 768,
			mimetype: 'image/jpeg'
		})
			.then((yah) => {})
			.catch((error) => {
				console.log(error.message);
				expect(error).to.not.be.null;
	          	expect(error).to.not.be.undefined;
	          	expect(error.message).to.equal('Pic-pipe input invalid/missing property: buffer');
				done();
			});
	});

	it('Should error with undefined buffer, maxPixel and mimetype', (done) => {
		picPipe.resizeAndCompress({
			thumb: true,
		})
			.then((yah) => {})
			.catch((error) => {
				console.log(error.message);
				expect(error).to.not.be.null;
	          	expect(error).to.not.be.undefined;
	          	expect(error.message).to.equal('Pic-pipe input invalid/missing properties: buffer, maxPixel and mimetype');
				done();
			});
	});
});