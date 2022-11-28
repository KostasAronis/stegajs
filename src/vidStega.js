const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const LSB = require('../lib/lsb');
const FFMPEG = require('../lib/ffmpeg');
const { Piscina } = require('piscina');
const { SHARE_ENV } = require('worker_threads');
const Logger = require('../lib/logger')

class VidStega {
  constructor(keyFile, keepTemp = false, debug = false) {
    this.keyFile = keyFile;
    this.keepTemp = keepTemp;

    this.tmp = './temp'
    this.embeddedImagePath = `${this.tmp}/embedded_images`;
    this.extractedImagePath = `${this.tmp}/extracted_images`;
    this.embeddedVideoFile = `${this.tmp}/embedded_video.mp4`;

    this.debug = debug;
    this.logger = Logger(this.debug);
    process.env.DBG = debug;

    this.piscina = new Piscina({
      filename: path.resolve(__dirname, 'worker.js'),
      env: SHARE_ENV
    });
  }

  calculateTotalImagesNeeded(msgBuffer, imgBuffer) {
    // every msg byte needs 4 packets
    const totalPacketsNeeded = msgBuffer.length * 4;

    //23 packets for the header -> 8 for image number * 15 for packet count
    const totalPacketsPerImage = imgBuffer.length - 23;

    const totalImagesNeeded = Math.ceil(totalPacketsNeeded / totalPacketsPerImage);
    return totalImagesNeeded
  }

  getChunk(msgBuffer, chunkSize, i) {
    const startingPosition = i * chunkSize;
    return msgBuffer.slice(startingPosition, startingPosition + chunkSize)
  }

  async embedMSGToMultipleImages(msgFile, imageFile, outPath, keyFile, total_images_for_video = 18000) {
    var keyBuffer = fs.readFileSync(keyFile, null);
    var msgBuffer = fs.readFileSync(msgFile, null);
    var msgFileName = path.basename(msgFile);

    const lsb = new LSB(keyBuffer);

    const { data: imageBuffer, info: imageInfo } = await sharp(imageFile).
      raw().
      toBuffer({ resolveWithObject: true })

    const totalChunks = this.calculateTotalImagesNeeded(msgBuffer, imageBuffer);
    const chunkSize = Math.ceil(msgBuffer.length / totalChunks);

    // we need the first image as a header, describing the number of images with data to follow as well
    // as the filename of the original file
    const totalImages = totalChunks;

    this.logger.debug(`Will need ${totalImages} + 1 to embed the message.`);

    const firstImageBuffer = await lsb.createFirstImage(totalImages, msgFileName, imageBuffer, imageInfo);

    this.logger.debug('created first image buffer');

    await sharp(
      firstImageBuffer,
      {
        raw: {
          width: imageInfo.width,
          height: imageInfo.height,
          channels: imageInfo.channels,
          premultiplied: imageInfo.premultiplied
        }
      }
    ).toFile(`${outPath}/image1.png`);

    this.logger.debug('created first image file');

    var piscinaJobs = []
    for (let i = 0; i < totalImages; i++) {
      const chunk = Buffer.from(this.getChunk(msgBuffer, chunkSize, i));

      piscinaJobs.push(this.piscina.run({ i, outPath, keyBuffer, chunk, imageBuffer, imageInfo }, { name: 'embed' }));
    }

    await Promise.all(piscinaJobs);
  }

  async extractMSGFromMultipleImages(imagePath, outPath, keyFile) {
    var keyBuffer = fs.readFileSync(keyFile, null);
    const lsb = new LSB(keyBuffer);

    const firstImage = `${imagePath}/image1.png`
    const { data: firstImageBuffer, info: imageInfo } = await sharp(firstImage).
      raw().
      toBuffer({ resolveWithObject: true });

    const { imageCount, fileName } = lsb.extractFirstImageData(firstImageBuffer);

    this.logger.debug(`will use ${imageCount} to recreate ${fileName}`)

    const piscinaJobs = [];
    for (let i = 0; i < imageCount; i++) {
      piscinaJobs.push(this.piscina.run({ i, keyBuffer, imagePath }, { name: 'extract' }))
    }

    const extractedMSGParts = await Promise.all(piscinaJobs);

    const extractedMSGBuffer = Buffer.concat(extractedMSGParts);
    fs.writeFileSync(`${outPath}/${fileName}`, extractedMSGBuffer, { encoding: null })
  }

  async embed(messageFile, imageFile, audioFile, outPath) {
    this.logger.log(`Started embedding ${messageFile} to ${outPath}`);

    fs.mkdirSync(this.embeddedImagePath, { recursive: true });
    await this.embedMSGToMultipleImages(messageFile, imageFile, this.embeddedImagePath, this.keyFile);

    await FFMPEG.combineImagesToVideo(this.embeddedImagePath, this.embeddedVideoFile);

    fs.mkdirSync(outPath, { recursive: true });
    await FFMPEG.combineAudioAndVideo(this.embeddedVideoFile, audioFile, `${outPath}/embedded_video_audio.mp4`);

    if (!this.keepTemp) {
      fs.rmSync(this.tmp, { recursive: true, force: true });
    }
  }

  async retrieve(vidFile, outPath) {
    this.logger.log(`Started retrieving data from ${vidFile} to ${outPath}`);

    fs.mkdirSync(this.extractedImagePath, { recursive: true });
    await FFMPEG.extractFrames(vidFile, this.extractedImagePath)

    fs.mkdirSync(outPath, { recursive: true });
    await this.extractMSGFromMultipleImages(this.extractedImagePath, outPath, this.keyFile);

    if (!this.keepTemp) {
      fs.rmSync(this.tmp, { recursive: true, force: true });
    }
  }

  static createKey(outFile, length = 256) {
    return fs.writeFileSync(
      outFile,
      crypto.getRandomBytes(length),
      { encoding: null }
    )
  }
}

module.exports = VidStega;
