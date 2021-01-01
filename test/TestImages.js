const testLocation = `${process.cwd()}/test_images/`;

const size = ['large', 'small'];
const types = ['jpeg', 'png'];
const orientations = ['portrait', 'landscape', 'square'];

const makePaths = (input) => {
	let pathSet = [];
	if (input.types) input.types.map((type, i) => {
		if (input.orient) input.orient.map((orrient, i) => {
			if (input.size[0]) pathSet.push(input.size[0] + '_' + orrient + '_' + type);
			if (input.size[1]) pathSet.push(input.size[1] + '_' + orrient + '_' + type);
		});
	});
	return pathSet;
}

const makeOptions = (input) => {
	let parts = input.file.split('_');
	let filename = `${parts[0]}_${parts[1]}.${parts[2]}`;
	return {
		filename: filename,
		url: testLocation + filename,
		mime: parts[2],
		orient: input.orient ? input.orient : parts[1],
		detail: input.file.replace(/_/g, ' ')
	};
};

module.exports = {
	makePaths,
	makeOptions
};