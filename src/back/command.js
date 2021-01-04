const { spawn } = require('child_process');

/**
 * @callback ExecProgressCallback
 * @param { Blob } content
 * @returns undefined;
 */

/**
 * @param { String } command
 * @param { String[] } args
 * @param { ExecProgressCallback } progress
 * @returns { Promise<String> }
 */
function execCommand (command, args, progress) {
  return new Promise((resolve, reject) => {
    try {
      const exec = spawn(command, args, { shell: true });

      exec.stdout.on('data', data => {
        if (progress) {
          progress(data);
        }
      });

      exec.stderr.on('data', data => {
        if (progress) {
          progress(data);
        }
      });

      exec.on('error', error => {
        reject(error);
      });

      exec.on('close', code => {
        resolve(`child process exited with code ${code}.`);
      });
    } catch (x) {
      reject(x);
    }
  });
}

module.exports.execCommand = execCommand;
