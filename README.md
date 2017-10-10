# pic-pipe
Pic-pipe is a set of tools for image buffers: Resizing based on orientation, automatically creating square thumbnails, compression within a desired filesize, extracting color values, uploading buffers to an AWS S3 bucket. It uses a common input/output object format for interoperability between functions.

If you need more precise control, or to work with non-buffers consider using the following libraries directly:

[Sharp (image manipulation)](https://github.com/lovell/sharp)

[AWS JS SDK (for CDN storage and more)](https://github.com/aws/aws-sdk-js)

[get-pixels (get ndarray from image)](https://github.com/scijs/get-pixels)

[get-rgba-palette (get key colors from ndarray)](https://github.com/mattdesl/get-rgba-palette)

[Chroma.js (color maniuplation)](http://gka.github.io/chroma.js/)

## Installation

`npm install pic-pipe --save`

## Usage

### Resize images automatically by proportions. 

`picPipe.resizeAndCompress(input, output);`

input:
- `input.buffer {buffer}`: Image buffer.
- `input.mimetype {string}`: A string with the file mimetype.
- `input.maxPixel {number}`: Desired maximum dimension in pixels. Largest side will not exceed this size.
- `input.maxByte {number}`: (Default: 100000000) File size in bytes over which resizing will occur.
- `input.thumb {boolean}`: (Optional) if true, maxByte is ignored and a square thumb based on maxPixel.

output callback:
- `err {object}`: Contains the error object if there is an error.
- `input.buffer {buffer}`: Resized image buffer.
- `input.size {number}`: Size of new buffer.

```Javascript

myImage = {
	buffer: [buffer],
	mimetype: 'image/jpg',
	maxPixel: 2500,
	maxByte: 2500
};

picPipe.resizeAndCompress(myImage, function(err, colors) {
	if (err) {
		throw new Error(err);
	}
	console.log(colors);
	// returns input object with resized buffer and size properties
});

```

### Pull colors from image

`picPipe.colorPull(input, output);`

input:
- `input.buffer {buffer}`: Image buffer.
- `input.maxPixel {string}`: A string with the image mimetype.

output callback:
- `err {object}`: Contains the error object if there is an error.
- `input.picColors {array}`: An array with up to 9 color values a hex strings.
- `input.colorAverage {array}`: An Array with 3 numbers (0-255) for each RGB value.

```Javascript

myImage = {
	buffer: [buffer],
	mimetype: 'image/jpg'
};

picPipe.colorPull(myImage, function(err, colors) {
	if (err) {
		throw new Error(err);
	}
	console.log(colors);
	// returns 2 color arrays. Examples:
	// picColors = ['777777', '888888', '999999', 'aaaaaa', 'bbbbbb', 'cccccc', 'dddddd', 'eeeeee', 'ffffff']
	// colorAverage = [255, 255, 255]
});

```

### Upload to S3 bucket

`picPipe.bucketer(input, output);`

input
- `input.buffer {buffer}`: File buffer.
- `input.name {string}`: A string with name of directory, filename, and extension.
- `input.bucket {string}`: A string with the S3 bucket name.
- `input.mimetype {string}`: A string with the file mimetype.

output callback:
- `err {object}`: Contains the error object if there is an error.
- `input.eTag {string}`: An added string that confirms valid upload.

AWS properties must also be set as enviromental parameters:

- `process.env.S3_KEY`
- `process.env.S3_SECRET`
- `process.env.AWS_REGION`

```Javascript

myFile = {
	buffer: [buffer],
	name: 'my-directory/myfile.jpg',
	bucket: 'mybucket.amazonaws.com',
	mimetype: 'image/jpg'
};

picPipe.bucketer(myFile, function(err, uploaded) {
	if (err) {
		throw new Error(err);
	}
	console.log(uploaded);
	// returns object with ETag if successful
});

```

## Tests

`npm test`

