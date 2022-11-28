#!/usr/bin/env node

const { program } = require('commander');
const VidStega = require('./src/vidStega');

async function main() {
  program
    .name('stegajs')
    .description('Steganographically embed / retrieve a file into image / video.')
    .version('0.1.0');

  program.command('embed')
    .description('Embed a given file into a carrier image / video.')
    .requiredOption('-m, --messageFile <path-to-file>', 'the file to embed')
    .requiredOption('-i, --imageFile <path-to-file>', 'the image to be used for embedding')
    .requiredOption('-a, --audioFile <path-to-file>', 'the audio file to be used for the final video')
    .requiredOption('-k, --keyFile <path-to-file>', 'your private keyfile used to encrypt the message')
    .requiredOption('-o, --outPath <path-to-folder>', 'the path to create the output image / video', './out')
    .option('-d, --debug', 'print additional debug information', false)
    .option('-t, --keepTemp', 'keep temporary files after the process', false)
    .action(async (args) => {
      return new VidStega(args.keyFile, args.keepTemp, args.debug).
        embed(args.messageFile, args.imageFile, args.audioFile, args.outPath)
    });

  program.command('retrieve')
    .requiredOption('-v, --videoFile <path-to-file>', 'the video file in which the message is embedded')
    .requiredOption('-k, --keyFile <path-to-file>', 'your private keyfile used to decrypt the message')
    .requiredOption('-o, --outPath <path-to-folder>', 'the path to save the retrieved file', './out')
    .option('-d, --debug', 'print additional debug information', false)
    .option('-t, --keepTemp', 'keep temporary files after the process', false)
    .action(async (args) => {
      return new VidStega(args.keyFile, args.keepTemp, args.debug).
        retrieve(args.videoFile, args.outPath)
    });

  program.command('createKey')
    .option('-o, --outPath <path-to-folder>', 'the path to create the key file', './keyfile')
    .option('-l, --length <bytes>', 'the length of the key in bytes', 256)
    .action((args) => {
      return VidStega.createKey(args.outFile, args.length)
    });

  return program.parseAsync()
}

main().
  then().
  catch(err => {
    console.error(err);
    process.exit(1);
  });