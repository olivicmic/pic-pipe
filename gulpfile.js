var mainFile = require('./index.js'),
	gulp = require('gulp'),
	plugins = require('gulp-load-plugins')();

gulp.task('watch', function() {
	gulp.watch(['**/*.js', '!node_modules/**'], gulp.series('eslint'));
});

// ESLint JS linting task
gulp.task('eslint', function () {

	return gulp.src(['**/*.js', '!node_modules/**'])
		.pipe(plugins.eslint())
		.pipe(plugins.eslint.format());
});

gulp.task('default', gulp.series('watch', function (done) {
	done();
}));