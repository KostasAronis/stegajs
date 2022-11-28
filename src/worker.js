/**
 * This module contains functions meant to be used as worker functions with piscina module for
 * concurrent embedding and extracting data into images
*/
const LSB = require('../lib/lsb');
const sharp = require('sharp');
const logger = require('../lib/logger')(process.env.DBG == 'true');

async function embed({ i, outPath, keyBuffer, chunk, imageBuffer, imageInfo }) {
  const lsb = new LSB(keyBuffer);
  let embeddedImage = await lsb.embedMSG(chunk, imageBuffer, imageInfo);

  await sharp(
    embeddedImage,
    {
      raw: {
        width: imageInfo.width,
        height: imageInfo.height,
        channels: imageInfo.channels,
        premultiplied: imageInfo.premultiplied
      }
    }
  ).toFile(`${outPath}/image${i + 2}.png`);
  logger.debug(`wrote ${i + 2} embedded image file`);
}

async function extract({ i, keyBuffer, imagePath }) {
  const lsb = new LSB(keyBuffer);
  const imageFile = `${imagePath}/image${i + 2}.png`
  const imageBufferWithMessage = await sharp(imageFile).
    raw().
    toBuffer();

  logger.debug(`extracting data from image ${i}`);

  return lsb.extractMSG(imageBufferWithMessage);
}

module.exports = { embed, extract };