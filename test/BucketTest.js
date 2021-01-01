const fs = require('fs'),
	expect = require('chai').expect,
	picPipe = require('../index'),
	lal = require('lal'),
	mimer = require('./Mimer');

module.exports = (options, done) => {
	fs.readFile(options.url, (err, data) => {
		var pic = {
			buffer: data,
			name: 'testing_dir/' + lal.dateFormat() + '.' + options.mime,
			bucket: process.env.S3_BUCKET,
			mimetype: mimer(options.mime)
		};
		picPipe.bucketer(pic, (err, uploaded) => {
			if (err) {
				console.log('bucketer error:');
				console.log(err);
				done(err);
			}
			console.log('uploaded:');
			console.log(uploaded);
			expect(uploaded).to.include.keys('eTag');
			done();
		});
	});
};