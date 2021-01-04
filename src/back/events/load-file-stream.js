const { join, unlink } = require('path');
const { appendFile } = require('fs');
const { getThumbnail, getVideoInfo } = require('../ffmpeg.js');

/**
 * @param { import("electron").IpcMain } main 
 */
function loadFileStream(main) {
  main.on('loadfilestream', (event, [id, filename, content]) => {
    const temp = join(temp, `${id}${filename.substr(filename.lastIndexOf('.'))}`);
    appendFile(temp, content, err => {
      if (err) {
        event.sender.send('loadfilestream-error', {id, err});
      } else {
        getVideoInfo(temp)
          .then(info => {
            getThumbnail(id, temp)
              .then(image => {
                info.thumbnail = image;
                unlink(temp, err => {
                  if (err) {
                    event.sender.send('loadfilestream-error', {id, err});
                  } else {
                    event.sender.send('loadfilestream-success', {id, info});
                  }
                });
              })
              .catch(err => event.sender.send('loadfilestream-error', {id, err}));
          })
          .catch(err => {
            event.sender.send('loadfilestream-error', {id, err});
          });
      }
    });
  });  
}

module.exports.loadFileStream = loadFileStream;
