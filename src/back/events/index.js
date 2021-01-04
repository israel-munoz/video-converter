const { convertEvent } = require('./convert.js');
const { encodersEvent } = require('./encoders.js');
const { getThumbnailEvent } = require('./get-thumbnail.js');
const { loadFileEvent } = require('./load-file.js');
const { settingsEvent } = require('./settings.js');

module.exports = {
  convertEvent,
  encodersEvent,
  getThumbnailEvent,
  loadFileEvent,
  settingsEvent
};
