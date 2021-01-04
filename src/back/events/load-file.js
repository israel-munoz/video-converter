const { getVideoInfo } = require('../ffmpeg.js');

/**
 * @param { import("electron").IpcMain } main 
 */
function loadFileEvent(main) {
  main.on('loadfile', (event, args) => {
    getVideoInfo(args[0], true, true)
      .then(info => event.sender.send('loadfile-success', [parseInfo(info)]))
      .catch(error => event.sender.send('loadfile-error', error));
  });  
}

function parseInfo(info) {
  const format = info.format || {};
  const streams = info.streams || [];
  const video = streams[0] || {};
  const audio = streams[1] || {};
  const filename = format.filename || '';
  const name = filename.substr(filename.lastIndexOf('\\') + 1);
  const path = filename.substr(0, filename.lastIndexOf('\\'));
  const duration = Number(format.duration);
  const videoCodec = video.codec_name;
  const audioCodec = audio.codec_name;
  const width = video.width;
  const height = video.height;
  const frameRate = eval(video.avg_frame_rate);
  const audioRate = audio.sample_rate;
  return {
    name,
    path,
    duration,
    videoCodec,
    audioCodec,
    width,
    height,
    frameRate,
    audioRate
  };
}

module.exports.loadFileEvent = loadFileEvent;
