const sharp = require('sharp');

/*
  Class containing the core least significant bit logic.
*/
class LSB {
  /**
   * TODO: make packet size variable
   * PACKET_SIZE = 2; // 2 bits / packet
   */
  FIRST_HEADER_SIZE = 1040 // bits
  IMAGE_HEADER_SIZE = 30 // in bits

  constructor(keyBuffer) {
    this.keyBuffer = keyBuffer;
  }

  static byteToBitStringHash = {};

  static byteToBitString(byte) {
    if (!this.byteToBitStringHash[byte]) {
      const bitString = byte.toString(2).padStart(8, '0');

      this.byteToBitStringHash[byte] = bitString;
    }

    return this.byteToBitStringHash[byte];
  }

  static byteFromBitString(bitString) {
    return parseInt(bitString, 2);
  }

  static binaryToAscii(bin) {
    // first we strip all padded zeroes
    bin = bin.replaceAll('00000000', '')
    return bin.replace(/\s*[01]{8}\s*/g, function (bin) {
      return String.fromCharCode(parseInt(bin, 2))
    }).replaceAll('\x00', '')
  }

  static asciiToBinary(str) {
    // we add padded zeroes to reach totalSize so that we can have a standard size header
    return str.replace(/[\s\S]/g, function (str) {
      return str.charCodeAt().toString(2).padStart(8, '0')
    })
  }

  // TODO: change the way we encrypt so that we can swap encryption methods
  // eg. via an interface
  static xorMsg(msgBytes, keyBytes) {
    let keyByteCount = keyBytes.length
    let msgByteCount = msgBytes.length
    let outBytes = Buffer.alloc(msgByteCount);
    for (var i = 0; i < msgByteCount; i++) {
      outBytes[i] = msgBytes[i] ^ keyBytes[i % keyByteCount]
    }
    return outBytes
  }

  static firstImageHeaderPackets(imageCount, fileName) {
    var packets = []

    var imageCountPackets = imageCount.
      toString(2).
      padStart(16, '0').
      match(/.{1,2}/g);

    packets.push(...imageCountPackets);

    var fileNamePackets = this.asciiToBinary(fileName, 1024).
      padStart(1024, '0').
      match(/.{1,2}/g);

    packets.push(...fileNamePackets);

    return packets
  }

  static imageHeaderPackets(msg) {
    var packets = []
    // The first packets contain the information of the total size of the message in packets
    // This is required in order to know how many packets to read when decoding
    var msgByteSizePackets = (msg.length).
      toString(2).
      padStart(30, '0').
      match(/.{1,2}/g);

    packets.push(...msgByteSizePackets);
    return packets
  }

  static encodeMsgToPackets(msg) {
    // The first packets contain the information of the total size of the message in packets
    // This is required in order to know how many packets to read when decoding
    var packets = LSB.imageHeaderPackets(msg);

    for (var i = 0; i < msg.length; i++) {
      packets.push(...LSB.byteToBitString(msg[i]).match(/.{1,2}/g));
    }
    return packets
  }

  static decodeMsgFromPackets(packets) {
    var msg = []
    var currentByte = ''
    for (var i = 0; i < packets.length; i++) {
      currentByte += packets[i];
      if (currentByte.length == 8) {
        var currentByteVal = LSB.byteFromBitString(currentByte);
        msg.push(currentByteVal);
        currentByte = ''
      }
    }
    if (currentByte.length == 8) {
      msg.push(LSB.byteFromBitString(currentByte));
    }
    return Buffer.from(msg)
  }

  static embedPacketsToBuffer(packets, buffer) {
    var newBytes = Buffer.from(buffer);

    if (packets.length > buffer.length) {
      throw 'message packets too long for buffer length'
    }
    for (var i = 0; i < packets.length; i++) {
      var byteVal = buffer[i];
      var newByteVal = LSB.byteFromBitString(
        LSB.byteToBitString(byteVal).replace(/..$/, packets[i])
      );
      newBytes[i] = newByteVal;
    }
    return Buffer.from(newBytes)
  }

  static extractLSBPacketsFromBuffer(buffer, from = 0, to = null) {
    to = to || buffer.length
    var packets = [];
    for (var i = from; i < to; i++) {
      var byte = buffer[i];
      var bitString = LSB.byteToBitString(byte);
      var packet = bitString.slice(-2)
      packets.push(packet)
    }
    return packets;
  }

  // Creates the header image containing information about the image count required and the original filename of the message
  createFirstImage(totalImageCount, msgFileName, imageBuffer, imageInfo) {
    var firstImageHeaderPackets = LSB.firstImageHeaderPackets(totalImageCount, msgFileName);

    var embeddedMsgImageBuffer = LSB.embedPacketsToBuffer(firstImageHeaderPackets, imageBuffer);

    return sharp(
      embeddedMsgImageBuffer,
      {
        raw: imageInfo
      }
    ).toBuffer();
  }

  // Reads the header image data and returns the imageCount and the fileName of the original message
  extractFirstImageData(firstImageBuffer) {
    var imageCountPackets = LSB.extractLSBPacketsFromBuffer(firstImageBuffer, 0, 8);

    var imageCount = LSB.byteFromBitString(imageCountPackets.join(''))

    var fileNamePackets = LSB.extractLSBPacketsFromBuffer(firstImageBuffer, 8, 520);

    var fileName = LSB.binaryToAscii(fileNamePackets.join(''))

    return { imageCount, fileName }
  }

  // Given a buffer a message and a buffer of an image it creates a new image buffer containing the message buffer
  // embedded in the least significant bits of the image
  embedMSG(msgBuffer, imageBuffer, imageInfo) {
    var encryptedMsgBuffer = LSB.xorMsg(msgBuffer, this.keyBuffer);
    var encryptedMsgPackets = LSB.encodeMsgToPackets(encryptedMsgBuffer);
    var embeddedMsgImageBuffer = LSB.embedPacketsToBuffer(encryptedMsgPackets, imageBuffer);

    return sharp(
      embeddedMsgImageBuffer,
      {
        raw: {
          width: imageInfo.width,
          height: imageInfo.height,
          channels: imageInfo.channels,
          premultiplied: imageInfo.premultiplied
        }
      }
    ).toBuffer();
  }

  // Given a buffer of an image containing an embedded message it returns the buffer of the message in bytes
  extractMSG(imageBufferWithMessage) {
    var msgByteCountPackets = LSB.extractLSBPacketsFromBuffer(imageBufferWithMessage, 0, 15);
    var msgByteCount = LSB.byteFromBitString(msgByteCountPackets.join(''));
    var bytesToRead = msgByteCount * 4; // packets embeded in 4 sequential bytes make a byte from the original image
    var encryptedMsgPackets = LSB.extractLSBPacketsFromBuffer(imageBufferWithMessage, 15, 15 + bytesToRead);
    var encryptedMsg = LSB.decodeMsgFromPackets(encryptedMsgPackets)
    return LSB.xorMsg(encryptedMsg, this.keyBuffer)
  }
}

module.exports = LSB;