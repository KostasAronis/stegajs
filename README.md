# stegajs
A NodeJS cli tool for steganographically concealing a file within the data of a video file.  

# Table of contents
- [How It Works](#how-it-works)
  - [Least Significant Bit Steganography](#least-significant-bit-steganography)
  - [Image Headers](#image-headers)
  - [Process Flows](#process-flows)
    - [Embed Process](#embed-process)
    - [Retrieve Process](#retrieve-process)
    - [Flow Chart](#flow-chart)
- [Usage](#usage)
  - [General Usage](#general-usage)
  - [Embed Usage](#embed-usage)
  - [Retrieve Usage](#retrieve-usage)
  - [Create Key Usage](#create-key-usage)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)


# How it works

[(Back to top)](#table-of-contents)

The core idea of this steganography is hidding data in plain sight. There are many different types of carrier media that can hold the secret message. Image steganography tries to hide data in an image without changing the look of the image for the naked eye.  
Video steganography, which is the one used in this project tries to hide data in a video file without it being noticable by the watcher of the video. This means that the final video carrying the data must be watchable and indistinguishable from the original.  

Using a static image video (such as a music compilation from youtube) as a base makes the process a lot easier so for this first version we chose to use this method.  

RESTRICTIONS:
* This currently only works on .png images.
* We currently only change a frame once every 2 seconds (fps = 1/2). This is done for easier syncing of embedding / retrieving. This tremendously lowers the size of data that can be conceiled per second of video.

## Least Significant Bit Steganography
Each image can be represented by an array of pixels and each pixel can be represented in the RGB colorspace as three values (0-255), or three 8bit binary numbers.  
What least siginificant bit steganography does is hide a couple of bits from the original data in the last couple of bits from the channels of each of the image's pixels. This changes the value of each channel so little that no visual change can be spotted. The more bits we use from each channel the more noticable the changes will be.

## Image Headers
For retrieving the data from the altered images we require two types of headers:

#### First image header
The first image of the embedded video keeps information about the original filename as well as the total number of images required for embedding it in the following form:  
[...image_count....file_name...]  
[-----16bits------1024bits---]  

#### Each image header
In each subsequent image the first bits keep information about how many data packets ( bits ) are in the image. This is required because some of the images may not contain data or may contain data up to a specific pixel.  
[....packet_count....]  
[------30bits------]

## Process flows

#### Embed Process
##### input: ( video file | image file & audio file) & encrypt key file & message file
##### output: data embedded video file
1. Calculate how much data we can hide in each instance of the given input image
1. Split the original message file in chunks of said data size
1. Create a "header" image containing the original file name and total image count ( to be used for retriving the data later)
1. Create one embedded image using the sample image and embedding the chunk data inside after first encrypting the data with the key
1. Join the images into a video
1. Apply the input audio to the video file

#### Retrieve Process
##### input: data embedded video file & encrypt key file
##### output: message file
1. Split the video in frames
1. Read the data from the header frame to see how many images we need to read
1. Read each frame and append the data to a buffer after decrypting them with the key
1. Write the buffer to a file with the original filename  

#### Flow Chart
![1](https://user-images.githubusercontent.com/12852170/201436913-7cdd6c34-09cd-49fa-aaed-d4353f59691a.png)

# Usage
[(Back to top)](#table-of-contents)

Meant to be used as a cli tool.  
This app requires ffmpeg to be present in your path.

## General Usage
```
Usage: stegajs [options] [command]

Steganographically embed / retrieve a file into image / video.

Options:
  -V, --version        output the version number
  -h, --help           display help for command

Commands:
  embed [options]      Embed a given file into a carrier image / video.
  retrieve [options]
  createKey [options]
  help [command]       display help for command
```

## Embed Usage
```
Usage: stegajs embed [options]

Embed a given file into a carrier image / video.

Options:
  -m, --messageFile <path-to-file>  the file to embed
  -i, --imageFile <path-to-file>    the image to be used for embedding
  -a, --audioFile <path-to-file>    the audio file to be used for the final video
  -k, --keyFile <path-to-file>      your private keyfile used to encrypt the message
  -o, --outPath <path-to-folder>    the path to create the output image / video (default: "./out")
  -d, --debug                       print additional debug information (default: false)
  -t, --keepTemp                    keep temporary files after the process (default: false)
  -h, --help                        display help for command
```

## Retrieve Usage
```
Usage: stegajs retrieve [options]

Options:
  -v, --videoFile <path-to-file>  the video file in which the message is embedded
  -k, --keyFile <path-to-file>    your private keyfile used to decrypt the message
  -o, --outPath <path-to-folder>  the path to save the retrieved file (default: "./out")
  -d, --debug                     print additional debug information (default: false)
  -t, --keepTemp                  keep temporary files after the process (default: false)
  -h, --help                      display help for command
```

## Create Key Usage
```
Usage: stegajs createKey [options]

Options:
  -o, --outPath <path-to-folder>  the path to create the key file (default: "./keyfile")
  -l, --length <bytes>            the length of the key in bytes (default: 256)
  -h, --help                      display help for command
```

# Installation

[(Back to top)](#table-of-contents)

Until a better packaged version comes the way to install and use this package is by using it as a nodejs script:

1. Install Node ( tested with version 16.13.2 )
1. Download the repository from github
1. Run `npm install` to get the necessary packages
1. Run `node app.js` with the desired options

# Next Steps / TODOs

[(Back to top)](#table-of-contents)

* Transcribe code to Typescript
* Write tests
* Fix syncing errors to allow for bigger framerates
* Fix audio / video sync to allow for real videos instead of single screen videos
* Implement download / install ffmpeg command
* Create build pipeline to produce executable binaries

# Contributing

[(Back to top)](#table-of-contents)

Your contributions are always welcome! Open an issue / pull request and lets discuss it.

# License

[(Back to top)](#table-of-contents)

[GNU General Public License v3.0](LICENSE.md)
