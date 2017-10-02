'use strict';

function picPipe() {
	console.log('yahh');
}

exports.mathStuff = function (number, locale) {
	return number.toLocaleString(locale);
};