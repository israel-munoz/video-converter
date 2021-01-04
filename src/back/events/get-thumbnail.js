const { getThumbnail } = require('../ffmpeg.js');

/**
 * @param { import("electron").IpcMain } main 
 */
function getThumbnailEvent(main) {
  main.on('getthumbnail', (event, [id, file]) => {
    getThumbnail(id, file)
      .then(image => {
        event.sender.send('getthumbnail-success', {id, image});
      })
      .catch(error => event.sender.send('getthumbnail-error', {id, error}));
  });
  
}

module.exports.getThumbnailEvent = getThumbnailEvent;
