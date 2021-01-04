const { ipcRenderer } = require('electron');

/**
 * @typedef VideoConvertOptions
 * @property { String } output
 * @property { 'libx264' } videoCodec
 * @property { 'aac' } audioCodec
 * @property { Number } crf
 * @property { 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow' } preset
 */

 /**
  * @callback VideoSizeChanged
  * @param { Number } width
  * @param { Number } height
  * @returns undefined;
  */

/**
 * @param { HTMLElement } container
 * @param { ipcRenderer } renderer
 * @param { Object } defaults
 * @param { VideoSizeChanged } sizeChanged
 */
function initOptions(container, renderer, defaults, sizeChanged) {
  const output = container.querySelector('#output');
  const width = container.querySelector('#video-width');
  const height = container.querySelector('#video-height');
  const videoEncoder = container.querySelector('#video-encoder');
  const audioEncoder = container.querySelector('#audio-encoder');
  const crf = container.querySelector('#crf');
  const preset = container.querySelector('#preset');

  sizeChanged = sizeChanged || (() => []);

  width.addEventListener('focus', () => width.currentValue = width.valueAsNumber);
  height.addEventListener('focus', () => height.currentValue = height.valueAsNumber);
  width.addEventListener('change', () => {
    const h = Math.ceil(height.valueAsNumber * width.valueAsNumber / width.currentValue);
    height.value = h;
    sizeChanged(width.valueAsNumber, h);
  });
  height.addEventListener('change', () => {
    const w = Math.ceil(width.value = width.valueAsNumber * height.valueAsNumber / height.currentValue);
    width.value = w;
    sizeChanged(w, height.valueAsNumber);
  });
  output.value = defaults.output;
  crf.value = defaults.crf;
  preset.querySelectorAll(`option[value=${defaults.preset}]`).forEach(p => p.selected = true);
  
  renderer.send('encoders');

  renderer.on('encoders-success', (_evt, [data]) => {
    addOptions(videoEncoder, data.filter(enc => enc.type === 'video'));
    addOptions(audioEncoder, data.filter(enc => enc.type === 'audio'));
    videoEncoder.querySelectorAll(`option[value=${defaults.videoEncoder}]`).forEach(v => v.selected = true);
    audioEncoder.querySelectorAll(`option[value=${defaults.audioEncoder}]`).forEach(a => a.selected = true);
  });
  
  renderer.on('encoders-error', (evt, error) => {
    alert(error);
  });

  /**
   * @param { HTMLSelectElement } select
   * @param { Object[] } data
   */
  function addOptions(select, data) {
    data.forEach(enc => {
      const option = document.createElement('option');
      option.value = enc.id;
      option.textContent = enc.name;
      select.appendChild(option);
    });
  }
}

/**
 * @param { HTMLElement } container
 * @returns { VideoConvertOptions }
 */
function getValues(container) {
  return {
    output: container.querySelector('#output').value,
    videoEncoder: container.querySelector('#video-encoder').value,
    audioEncoder: container.querySelector('#audio-encoder').value,
    crf: container.querySelector('#crf').valueAsNumber,
    preset: container.querySelector('#preset').value
  };
}

/**
 * 
 * @param { HTMLElement } container
 * @param { VideoConvertOptions } options 
 */
function setValues(container, options) {
  options.output && (container.querySelector('#output').value = options.output);
  options.width && (container.querySelector('#video-width').value = options.width);
  options.height && (container.querySelector('#video-height').value = options.height);
  options.videoCodec && (container.querySelector('#video-encoder').value = options.videoCodec);
  options.audioCodec && (container.querySelector('#audio-encoder').value = options.audioCodec);
  options.crf == null && (container.querySelector('#crf').value = options.crf);
  options.preset && (container.querySelector('#preset').value = options.preset);
}

module.exports.initOptions = initOptions;
module.exports.getValues = getValues;
module.exports.setValues = setValues;
