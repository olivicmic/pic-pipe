# pic-pipe 3.0.0 Release Notes
## Jan 2, 2021

## New Features

* **Promise-based bucketing** - pic-pipe.bucketer is now promised-based versus callbacks

# pic-pipe 2.0.0 Release Notes
## Jan 1, 2021

## New Features

* **Code Clean Up** - Redundant code removed. Removed a bug where jpeg compression may have been skipped. Should run better. Easier to read.

* **Tests Updated** - Test pictures are pulled locally rather than the web. Download at:http://pics.vics.pics/pic-pipe-test-images.zip then place them in the "test_images" folder then run the tests (or use your own images with the same naming/orientation format). The resizing tests no longer evalute for changed file sizes, as resized PNGs can be larger in file size versus orginal files due to differing compression methods. The tests have been rewritten to remove redundant code and function iteratively. Optionally you can have test compressed images saved locally in addition to the bucket upload test by setting the enviromental variable "PP_SAVE" to "true". You will find them in the "outputimg" folder.

* **Removed Uneeded Dependencies** - Removed Bluebird in favor of native promises which ran faster in this instance, as well as other dependencies that weren't needed.