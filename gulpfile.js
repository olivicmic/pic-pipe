var mainFile = require('./index.js'),
	gulp = require('gulp'),
	runSequence = require('run-sequence'),
	plugins = require('gulp-load-plugins')();

gulp.task('watch', function () {
	// Start livereload
	plugins.refresh.listen({ port: 1337 });
	gulp.watch(['**/*.js', '!node_modules/**'], ['eslint']).on('change', plugins.refresh.changed);
});

// ESLint JS linting task
gulp.task('eslint', function () {

	return gulp.src(['**/*.js', '!node_modules/**'])
		.pipe(plugins.eslint())
		.pipe(plugins.eslint.format());
});

gulp.task('default', function (done) {
	runSequence(['watch'], done);
});