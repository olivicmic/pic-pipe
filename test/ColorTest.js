const fs = require('fs'),
	expect = require('chai').expect,
	hexColorRegex = require('hex-color-regex'),
	picPipe = require('../index'),
	mimer = require('./Mimer');

module.exports = (options, done) => {
	fs.readFile(options.url, (err, data) => {
		var pic = {
			buffer: data,
			mimetype: mimer(options.mime)
		};
		picPipe.colorPull(pic, (err, colors) => {
			if (err) {
				console.log('colorPull error:');
				console.log(err);
				done(err);
			}
			console.log('picColors:');
			console.log(colors.picColors);
			console.log('colorAverage:');
			console.log(colors.colorAverage);
			expect(colors.picColors.length).to.be.above(1);
			expect(colors.picColors.length).to.be.at.most(9);
			expect(hexColorRegex({ strict: true }).test(colors.colorAverage)).to.be.true;
			done();
		});
	});
};