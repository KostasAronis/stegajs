const ffmpeg = require('fluent-ffmpeg');
const Logger = require('./logger');

/*
  Uses ffmpeg to extract frames from a video file at a rate of 2 images / second
  It runs the following command:
  ./ffmpeg.exe -i <inVideo> -f image2 -vf fps=fps=1/2 <imgPath>/image%d.png
*/
function extractFrames(inVideo, imgPath) {
  var logger = Logger();
  var outFrames = `${imgPath}/image%d.png`;
  var proc = new ffmpeg();

  return new Promise((resolve, reject) => {
    proc.addInput(inVideo)
      .on('start', function (ffmpegCommand) {
        /// log something maybe
        logger.debug('started extractFrames');
        logger.debug(ffmpegCommand);
      })
      .on('progress', function (data) {
        /// do stuff with progress data if you want
        logger.debug('progress extractFrames');
        logger.debug(data);
      })
      .on('end', function () {
        /// encoding is complete, so callback or move on at this point
        logger.debug('ended extractFrames')
        return resolve();
      })
      .on('error', function (err) {
        /// error handling
        logger.debug('error extractFrames');
        logger.debug(err);
        return reject(new Error(err));
      })
      .addOutputOption(`-f image2`)
      .addOutputOption(`-vf fps=fps=1/2`)
      .output(outFrames)
      .run();
  })
}

/*
  Uses ffmpeg to combine a blob of images to a video file
  It runs the following command:
  ./ffmpeg.exe -f image2 -r 0.5 -i <imgPath>/image%d.png -c:v copy <outFile>
*/
function combineImagesToVideo(imgPath, outFile) {
  var logger = Logger();
  var imgFiles = `${imgPath}/image%d.png`;
  var proc = new ffmpeg();

  return new Promise((resolve, reject) => {
    proc.addInput(imgFiles)
      .addInputOption(`-f image2`)
      .addInputOption(`-r 0.5`)
      .on('start', function (ffmpegCommand) {
        /// log something maybe
        logger.debug('started combineImagesToVideo');
        logger.debug(ffmpegCommand);
      })
      .on('progress', function (data) {
        /// do stuff with progress data if you want
        logger.debug('progress combineImagesToVideo');
        logger.debug(data);
      })
      .on('end', function () {
        /// encoding is complete, so callback or move on at this point
        logger.debug('ended combineImagesToVideo')
        return resolve();
      })
      .on('error', function (err) {
        /// error handling
        logger.debug('error combineImagesToVideo');
        logger.debug(err);
        return reject(new Error(err));
      })
      .addOutputOption(`-c:v copy`)
      .output(outFile)
      .run();
  })
}

/*
  Uses ffmpeg to extract the audio from a video file keeping the codec of the original file.
  It runs the following command:
  ./ffmpeg.exe -i <inVideo> -vn -acodec copy <outAudio>
*/
function extractAudio(inVideo, outAudio) {
  var logger = Logger();
  var proc = new ffmpeg();

  return new Promise((resolve, reject) => {
    proc.addInput(inVideo)
      .on('start', function (ffmpegCommand) {
        /// log something maybe
        logger.debug('started extractAudio');
        logger.debug(ffmpegCommand);
      })
      .on('progress', function (data) {
        /// do stuff with progress data if you want
        logger.debug('progress extractAudio');
        logger.debug(data);
      })
      .on('end', function () {
        /// encoding is complete, so callback or move on at this point
        logger.debug('ended extractAudio');
        return resolve();
      })
      .on('error', function (err) {
        /// error handling
        logger.debug('error extractAudio');
        logger.debug(err)
        return reject(err);
      })
      .addOutputOption('-vn')
      .addOutputOption('-acodec copy')
      .output(outAudio)
      .run();
  })
}

/*
  Uses ffmpeg to combine an audio and a video file keeping the codecs of the original files.
  It runs the following command:
  ./ffmpeg.exe -i <inAudio> -i <inVideo> -c copy -acodec copy -vcodec copy <outVideo>
*/
function combineAudioAndVideo(inVideo, inAudio, outVideo) {
  var logger = Logger();
  var proc = new ffmpeg();

  return new Promise((resolve, reject) => {
    proc.addInput(inAudio).addInput(inVideo)
      .on('start', function (ffmpegCommand) {
        /// log something maybe
        logger.debug('started combineAudioAndVideo');
        logger.debug(ffmpegCommand);
      })
      .on('progress', function (data) {
        /// do stuff with progress data if you want
        logger.debug('progress combineAudioAndVideo');
        logger.debug(data);
      })
      .on('end', function () {
        /// encoding is complete, so callback or move on at this point
        logger.debug('ended combineAudioAndVideo');
        return resolve();
      })
      .on('error', function (err) {
        /// error handling
        logger.debug('error combineAudioAndVideo');
        logger.debug(err)
        return reject(err);
      })
      .addOutputOption(`-c copy`)
      .addOutputOption(`-acodec copy`)
      .addOutputOption(`-vcodec copy`)
      .output(outVideo)
      .run();
  })
}

module.exports = {
  extractFrames,
  combineImagesToVideo,
  extractAudio,
  combineAudioAndVideo
}