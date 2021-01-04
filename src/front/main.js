/**
 * @typedef VideoConvertOptions
 * @property { 'libx264' } videoCodec
 * @property { 'aac' } audioCodec
 * @property { Number } crf
 * @property { 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow' } preset
 */

const { ipcRenderer } = require('electron');
const windowControl = require('./window-control.js');
const optionsControl = require('./options-control.js');

/** @type { HTMLButtonElement } */
const addFile = document.querySelector('#add-file');
/** @type { HTMLInputElement } */
const fileSelect = document.querySelector('#file-select');
/** @type { HTMLUListElement } */
const filesList = document.querySelector('#video-list ul');
/** @type { HTMLButtonElement } */
const convertButton = document.querySelector('#convert');
/** @type { HTMLElement } */
const optionsPanel = document.querySelector('footer');

const editFiles = [];

addFile.addEventListener('click', () => {
  fileSelect.click();
});

convertButton.addEventListener('click', convert);

filesList.addEventListener('click', fileClick);

fileSelect.addEventListener('change', () => {
  const files = Array.from(fileSelect.files).map(f => f.path);
  files.forEach(loadFile);
  fileSelect.value = null;
});

function loadFile(file) {
  ipcRenderer.send('loadfile', [file]);
}

function createListItem(item, id) {
  id = id || createId();
  const li = document.createElement('li');
  const name = document.createElement('strong');
  const path = document.createElement('span');
  const thumb = createThumbnailElement(id, item);
  const time = document.createElement('span');
  const remove = document.createElement('button');
  li.id = id;
  name.classList.add('name');
  name.textContent = item.name;
  path.classList.add('path');
  path.textContent = item.path;
  time.classList.add('duration');
  time.textContent = item.duration;
  remove.classList.add('remove');
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => {
    editFiles.splice(editFiles.indexOf(li.video), 1);
    li.remove();
  });
  
  li.appendChild(name);
  li.appendChild(path);
  li.appendChild(thumb);
  li.appendChild(time);
  li.appendChild(remove);
  item.id = id;
  li.video = item;
  filesList.appendChild(li);
  item.element = li;
  editFiles.push(item);
}

function createThumbnailElement(id, item) {
  const fig = document.createElement('figure');
  const img = document.createElement('img');
  fig.classList.add('thumbnail');
  fig.appendChild(img);
  if (item.thumbnail) {
    img.src = item.thumbnail;
  } else {
    ipcRenderer.send('getthumbnail', [id, `${item.path}\\${item.name}`]);
  }
  return fig;
}

ipcRenderer.on('loadfile-success', (_evt, [info]) => {
  createListItem(info);
});

ipcRenderer.on('getthumbnail-success', (_evt, {id, image}) => {
  const img = filesList.querySelector(`[id="${id}"] .thumbnail img`);
  if (img) {
    img.src = image;
  }
});

ipcRenderer.on('loadfilestream-success', (_evt, {id, format}) => {
  createListItem(format, id);
});

ipcRenderer.on('loadfilestream-error', (_evt, args) => {
  console.error(args);
  alert(args.error);
});

ipcRenderer.on('getthumbnail-error', (_evt, args) => {
  console.error(args);
  alert(args.error);
});

function createId() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (dt + Math.random()*16)%16 | 0;
    dt = Math.floor(dt/16);
    return (c === 'x' ? r :(r&0x3|0x8)).toString(16);
  });
  return uuid;
}

/**
 * @param { MouseEvent } e
 */
function convert(e) {
  e.preventDefault();
  e.stopPropagation();
  convertButton.disabled = true;
  /** @type { VideoConvertOptions } */
  const options = optionsControl.getValues(optionsPanel);
  const done = [];
  const files = editFiles.map((v, i) => v.done ? -1 : i).filter(i => i >= 0);
  const total = files.length;
  const limit = Math.min(files.length, 4);
  const converting = [];
  for (let x = 0; x < limit; x += 1) {
    converting.push(files.shift());
  }
  const sendConvert = idx => {
    const video = editFiles[idx];
    video.element.querySelector('.remove').disabled = true;
    addProgressBar(video.element);
    ipcRenderer.send('convert', {
      id: video.id,
      file: `${video.path}/${video.name}`,
      options: Object.assign({}, options, {width: video.width, height: video.height})
    });
  }
  const convertProgress = (_evt, {id, progress}) => onConvertProgress(id, progress);
  const convertError = (_evt, {id, err}) => onConvertError(id, err);
  const convertSuccess = (_evt, {id, file}) => {
    onConvertSuccess(id, file);
    const video = editFiles.find(v => v.id === id);
    video.done = true;
    video.element.querySelector('.remove').disabled = false;
    let idx = converting.find(i => files.indexOf(video) === i);
    done.push(idx);
    converting.splice(converting.indexOf(idx), 1);
    if (done.length < total) {
      if (files.length) {
        idx = files.shift();
        converting.push(idx);
        sendConvert(idx);
      }
    }
    if (done.length === total) {
      convertButton.disabled = false;
      ipcRenderer.off('convert-progress', convertProgress);
      ipcRenderer.off('convert-success', convertSuccess);
      ipcRenderer.off('convert-error', convertError);
    }
  };
  
  ipcRenderer.on('convert-progress', convertProgress);
  ipcRenderer.on('convert-success', convertSuccess);
  ipcRenderer.on('convert-error', convertError);

  converting.forEach(sendConvert);
}

/**
 * @param { HTMLLIElement } li
 */
function addProgressBar(li) {
  const div = document.createElement('div');
  const pb = document.createElement('progress');
  const span = document.createElement('span');
  pb.max = li.video.duration;
  span.textContent = '0';
  div.classList.add('progress');
  div.appendChild(pb);
  div.appendChild(span);
  li.appendChild(div);
}

/**
 * @param { String } id
 * @param { Number } progress
 */
function onConvertProgress(id, progress) {
  const video = editFiles.find(v => v.id === id);
  if (video) {
    const prog = Number(progress / video.duration * 100).toFixed(2);
    video.element.querySelector('.progress progress').value = progress;
    video.element.querySelector('.progress span').textContent = prog;
  }
}

function onConvertSuccess(id, file) {
  const video = editFiles.find(v => v.id === id);
  if (video) {
    const div = document.createElement('div');
    const span = document.createElement('span');
    const link = document.createElement('a');
    div.classList.add('done');
    span.textContent = 'Done';
    link.textContent = 'Open containing folder';
    link.href = getFolder(file);
    div.appendChild(span);
    video.element.querySelector('.progress').remove();
    video.element.appendChild(div);
  }
}

function onConvertError(id, err) {
  const video = editFiles.find(v => v.id === id);
  if (video) {
    const div = document.createElement('div');
    div.classList.add('convert-error');
    div.textContent = err;
    video.element.querySelector('.progress').remove();
    video.element.appendChild(div);
  }
}

/**
 * @param { String } file
 */
function getFolder(file) {
  const sep = file.includes('\\') ? '\\'
    : file.includes('/') ? '/'
    : null;
  return file.substr(file.lastIndexOf(sep));
}

/**
 * @param { MouseEvent } evt
 */
function fileClick(evt) {
  const element = checkSelectedVideo(evt.target);
  if (element) {
    const video = element.video;
    if (evt.ctrlKey) {
      toggleFileSelect(video);
    } else {
      clearSelection();
      selectVideo(video);
    }
  }
}

/**
 * @param { HTMLElement } element
 * @returns { HTMLLIElement }
 */
function checkSelectedVideo(element) {
  if (element.tagName === 'UL') {
    return null;
  }
  return element.tagName === 'LI' ? element : checkSelectedVideo(element.parentElement);
}

function clearSelection() {
  editFiles.forEach(v => unselectVideo(v));
}

function toggleFileSelect(video) {
  if (video.selected) {
    unselectVideo(video);
  } else {
    selectVideo(video);
  }
}

function selectVideo(video) {
  video.selected = true;
  video.element.classList.add('selected');
  optionsControl.setValues(optionsPanel, { width: video.width, height: video.height });
}

function unselectVideo(video) {
  video.selected = false;
  video.element.classList.remove('selected');
}

ipcRenderer.send('settings');
ipcRenderer.on('settings-success', (_event, [config]) => {
  optionsControl.initOptions(optionsPanel, ipcRenderer, config, (w, h) => {
    editFiles.filter(v => v.selected).forEach(v => {
      v.width = w;
      v.height = h;
    })
  });
});

windowControl.bindEvents();
