const { getEncoders } = require('../ffmpeg.js');

/**
 * @param { import("electron").IpcMain } main
 */
function encodersEvent(main) {
  main.on('encoders', (event) => {
    getEncoders()
      .then(data => {
        event.sender.send('encoders-success', [data]);
      })
      .catch(error => event.sender.send('encoders-error', error));
  });  
}

module.exports.encodersEvent = encodersEvent;
