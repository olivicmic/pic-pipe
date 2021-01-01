module.exports = (mime) => {
	if (mime === 'jpeg' || mime === 'jpg') return 'image/jpeg';
	if (mime === 'png') return 'image/png';
	throw new Error('invalid mimetype');
};