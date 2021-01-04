const { resolve } = require('path');

/**
 * @param { import("electron").IpcMain } main
 */
function settingsEvent(main) {
  main.on('settings', (event) => {
    const config = {
      output: resolve('/Videos/DestesoftVideoConverter'),
      videoEncoder: 'libx264',
      audioEncoder: 'aac',
      crf: 23,
      preset: 'medium'
    };
    event.sender.send('settings-success', [config]);
  });
}

module.exports.settingsEvent = settingsEvent;
