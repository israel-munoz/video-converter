const { existsSync, mkdirSync } = require('fs');
const { sep, resolve } = require('path');
const { convertVideo } = require('../ffmpeg');

/**
 * @param { import("electron").IpcMain } main 
 */
function convertEvent(main) {
  main.on('convert', (event, {id, file, options}) => {
    const output = getVideoOutput(options.output);
    convertVideo(file, output, options, progress => {
      event.sender.send('convert-progress', {id, progress});
    })
      .then(res => {
        event.sender.send('convert-success', {id, file: res});
      })
      .catch(err => {
        event.sender.send('convert-error', {id, err});
      });
  });  
}

/**
 * @param { String } output
 * @returns { String }
 */
function getVideoOutput(output) {
  const path = resolve(output);
  const parts = path.split(sep);
  let check = parts[0];
  let i = 1;
  while (i < parts.length) {
    check = `${check}${sep}${parts[i]}`;
    if (!existsSync(check)) {
      mkdirSync(check);
    }
    i += 1;
  }
  return path;
}

module.exports.convertEvent = convertEvent;
