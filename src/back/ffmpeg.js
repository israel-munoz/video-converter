/**
 * @typedef Encoder
 * @property { String } id
 * @property { String } name
 * @property { 'video' | 'audio' | 'subtitle' } type
 * @property { Boolean } frameLevelMultithread
 * @property { Boolean } sliceLevelMultithread
 * @property { Boolean } experimental
 * @property { Boolean } drawHorizBand
 * @property { Boolean } directRenderingMethod1
 */

/**
 * @callback ConversionProgressCallback
 * @param { number } progress
 * @returns undefined;
 */

/**
 * @typedef VideoConvertOptions
 * @property { 'libx264' } videoCodec
 * @property { 'aac' } audioCodec
 * @property { Number } crf
 * @property { 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow' } preset
 */

const { existsSync, readFileSync, unlink, unlinkSync } = require("fs");
const { join, sep } = require('path');
const { execCommand } = require("./command");

/**
 * @returns { Promise<Encoder[]> }
 */
function getEncoders() {
  return new Promise((resolve, reject) => {
    const cmd = 'ffmpeg';
    const args = ['-encoders'];
    let text = '';
    const lineFilter = /^ (V|A|S|\.)..... \w/;
    execCommand(cmd, args, p => {
      text += p.toString('utf-8');
    }).then(() => {
      const lines = text.split('\n').filter(l => lineFilter.test(l));
      const result = lines.map(parseEncoder);
      resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  });
}

/**
 * @param { String } text
 * @returns { Encoder }
 */
function parseEncoder(text) {
  text = text.trim();
  /** @type { Encoder } */
  const result = {
    type: text[0] === 'V' ? 'video' : text[0] === 'A' ? 'audio' : 'subtitle',
    frameLevelMultithread: text[1] === 'F',
    sliceLevelMultithread: text[2] === 'S',
    experimental: text[3] === 'X',
    drawHorizBand: text[4] === 'B',
    directRenderingMethod1: text[5] === 'D'
  };
  text = text.substr(text.indexOf(' ')).trim();
  result.id = text.substr(0, text.indexOf(' ')).trim();
  result.name = text.substr(text.indexOf(' ')).trim();
  return result;
}

/**
 * @param { String } file
 * @returns { Promise<Object> }
 */
function getVideoInfo(file, showFormat = true, showStreams = false) {
  return new Promise((resolve, reject) => {
    if (!existsSync(file)) {
      resolve(`File ${file} not found.`);
      return;
    }
    if (file.includes(' ')) {
      file = `"${file}"`;
    }
    const cmd = 'ffprobe';
    const args = [
      '-v quiet',
      '-print_format json',
      showFormat ? '-show_format' : null,
      showStreams ? '-show_streams' : null,
      file
    ].filter(Boolean);
    let text = '';
    execCommand(cmd, args,
      p => text += p.toString('utf-8'))
      .then(() => {
        try {
          const info = JSON.parse(text);
          resolve(info);
        } catch (x) {
          reject(x.message);
        }
      });
  });
}

/**
 * @param { String } id
 * @param { String } file
 * @returns { Promise<Object> }
 */
function getThumbnail(id, file) {
  return new Promise((resolve, reject) => {
    if (!existsSync(file)) {
      resolve(`File ${file} not found.`);
      return;
    }
    if (file.includes(' ')) {
      file = `"${file}"`;
    }
    getVideoInfo(file, true, true)
      .then(({streams}) => {
        if (streams) {
          const temp = `./temp/${id}.jpg`
          const video = streams[0];
          const {width, height} = resize(video.width, video.height, 150);
          const cmd = 'ffmpeg';
          const args = [
            `-i ${file}`,
            '-vframes 1',
            '-an',
            `-s ${width}x${height}`,
            `-ss ${Math.floor(video.duration / 2)}`,
            temp
          ];
          execCommand(cmd, args)
            .then(r => {
              const image = base64_encode(temp);
              unlink(temp, (err => {
                if (err) {
                  reject(err);
                } else {
                  resolve(`data:${getMimeType(temp)};base64,${image}`);
                }
              }));
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
}

/**
 * @param { String } file
 * @param { String } outputDir
 * @param { VideoConvertOptions } options,
 * @param { ConversionProgressCallback } progress
 */
function convertVideo(file, outputDir, options, progress) {
  file = join(file);
  options = setDefaultOptions(options);
  return new Promise((resolve, reject) => {
    if (!existsSync(file)) {
      reject(`File ${file} not found.`);
      return;
    }
    const filename = file.substr(file.lastIndexOf(sep) + 1);
    let resultPath = join(outputDir, filename.substr(0, filename.lastIndexOf('.')) + '.mp4');
    if (file.includes(' ')) {
      file = `"${file}"`;
    }
    if (resultPath.includes(' ')) {
      resultPath = `"${resultPath}"`;
    }
    if (existsSync(resultPath)) {
      unlinkSync(resultPath);
    }
    const cmd = 'ffmpeg';
    const args = [
      `-i ${file}`,
      `-c:v ${options.videoCodec}`,
      `-c:a ${options.audioCodec}`,
      `-crf ${options.crf.toFixed(0)}`,
      `-preset ${options.preset}`,
      options.width && options.height ? `-vf scale=${options.width}:${options.height}` : '',
      resultPath
    ].filter(Boolean);
    execCommand(cmd, args,
      data => {
        const text = data.toString('utf-8');
        if (text.substr && text.indexOf('time=') > 0) {
          let t = text.substr(text.indexOf('time=') + 5);
          t = t.substr(0, t.indexOf(' ')).trim();
          const time = toSeconds(t);
          progress(time);
        }
      })
      .then(r => {
        resolve(resultPath);
      })
      .catch(err => {
        reject(err);
      });
  });
}

function base64_encode(file) {
  var bitmap = readFileSync(file);
  return Buffer.from(bitmap).toString('base64');
}

/**
 * @param { Number } width
 * @param { Number } height
 * @param { Number } max
 */
function resize(width, height, max) {
  if (width > height) {
    return {
      width: max,
      height: Math.floor(height / width * max)
    };
  }
  return {
    width: Math.floor(width / height * max),
    height: max
  }
}

/**
 * @param { String } file
 */
function getMimeType(file) {
  const ext = file.substr(file.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'jpeg':
    case 'jpg':
    case 'png':
      return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    default:
      return 'application/octet-stream';
  }
}

/**
 * @param { String } time
 */
function toSeconds(time) {
  const parts = time.split(':');
  const length = parts.length;
  const s = Number(parts[length - 1]) || 0;
  const m = Number(parts[length - 2]) || 0;
  const h = Number(parts[length - 3]) || 0;
  return s + m * 60 + h * 60 * 60;
}

/**
 * @param { VideoConvertOptions } options
 * @returns { VideoConvertOptions }
 */
function setDefaultOptions(options) {
  /** @type { VideoConvertOptions } */
  const defaultValues = {
    videoCodec: 'libx264',
    audioCodec: 'aac',
    crf: 23,
    preset: 'medium'
  };
  return Object.assign({}, defaultValues, options);
}

module.exports.getEncoders = getEncoders;
module.exports.getVideoInfo = getVideoInfo;
module.exports.getThumbnail = getThumbnail;
module.exports.convertVideo = convertVideo;
