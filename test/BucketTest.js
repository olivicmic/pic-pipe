const fs = require('fs'),
	expect = require('chai').expect,
	picPipe = require('../index'),
	lal = require('lal'),
	mimer = require('./Mimer');

module.exports = (options, done) => {
	fs.readFile(options.url, (err, data) => {
		picPipe.bucketer({
			buffer: data,
			name: 'testing_dir/' + lal.dateFormat() + '.' + options.mime,
			bucket: process.env.S3_BUCKET,
			mimetype: mimer(options.mime)
		})
			.then((uploaded) => {
				console.log('uploaded:', uploaded);
				expect(uploaded).to.include.keys('eTag');
				done();
			})
			.catch((err) => {
				done(err)
			})
	});
};