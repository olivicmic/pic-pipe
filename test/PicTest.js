const fs = require('fs'),
	expect = require('chai').expect,
	sharp = require('sharp'),
	picPipe = require('../index'),
	lal = require('lal'),
	mimer = require('./Mimer');

const typeMsg = (mime, format) => console.log('input type: ' + mime + ', output type: ' + format);
const orientMsg = (type, width, height) => console.log('is ' + type + ' - width: ' + width + ', height: ' + height);

const picTest = (options, done) => {
	fs.readFile(options.url, (err, data) => {
		let isThumb = options.orient === 'thumb';
		let pic = {
			maxPixel: isThumb ? 200 : 2500,
			maxByte: 500000,
			compressTries: 3,
			compressLevel: 9,
			buffer: data,
			size: data.length,
			sizeUnchanged: data.length,
			mimetype: mimer(options.mime),
			thumb: isThumb
		}

		const originalSize = pic.size;
		console.log('original size: ' + originalSize);

		picPipe.resizeAndCompress(pic)
			.then((output) => {
				let path = `${process.cwd()}/outputImg/`;
				let filename = `${options.unique}-${pic.thumb ? 'thumb-' : ''}${options.filename}`;
				if (process.env.PP_SAVE) fs.writeFile(
					path + filename, output.buffer, 'base64',
					(err) => {
						if (err) console.log('Error saving file: ' + err);
						else console.log(`Saved ${filename} at ${path}`);
					});

				sharp(output.buffer)
					.metadata()
					.then((meta) => {
						if (options.mime === 'jpg' || options.mime === 'jpeg') {
							console.log(meta.format);
							typeMsg(options.mime, meta.format);
							expect(meta.format).to.equal(options.mime);
						}
						if (options.mime === 'png') {
							typeMsg(options.mime, meta.format);
							expect(meta.format).to.equal(options.mime);
						}
						if (options.orient === 'portrait') {
							console.log('max dimension: ' + pic.maxPixel);
							orientMsg(options.orient, meta.width, meta.height);
							expect(meta.height).to.be.at.most(pic.maxPixel);
							expect(meta.width).to.be.below(meta.height);
						}
						if (options.orient === 'landscape') {
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
			})
			.catch((err) => {
				console.log(err);
				done(err);
			});
	});
};

module.exports = picTest;