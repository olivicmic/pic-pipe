# pic-pipe
Pic-pipe is a set of tools for image buffers: Resizing based on orientation, automatically creating square thumbnails, compression within a desired filesize, extracting color values, uploading buffers to an AWS S3 bucket.

If you need more precise control, or to work with non-buffers consider using the following libraries directly:

[Sharp (image manipulation)](https://github.com/lovell/sharp)

[AWS JS SDK (for CDN storage and more)](https://github.com/aws/aws-sdk-js)

[get-pixels (get ndarray from image)](https://github.com/scijs/get-pixels)

[get-rgba-palette (get key colors from ndarray)](https://github.com/mattdesl/get-rgba-palette)

[Chroma.js (color maniuplation)](http://gka.github.io/chroma.js/)

## Installation

`npm install pic-pipe --save`

## Tests

`npm test`

