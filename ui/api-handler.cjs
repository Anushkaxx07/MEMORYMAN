const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Resolve path to sysscope.exe (in parent dir or cwd)
function getExePath() {
  const candidates = [
    path.resolve(__dirname, '../sysscope.exe'),
    path.resolve(__dirname, 'sysscope.exe'),
    path.resolve(process.cwd(), 'sysscope.exe'),
    path.resolve(process.cwd(), '../sysscope.exe')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return candidates[0];
}

function fetchProcessData() {
  return new Promise((resolve, reject) => {
    const exe = getExePath();
    if (!fs.existsSync(exe)) {
      return reject(new Error(`sysscope.exe not found at ${exe}. Please compile it first.`));
    }

    execFile(exe, ['--json'], { maxBuffer: 15 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`Failed to execute sysscope: ${stderr || err.message}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse sysscope output: ${parseErr.message}\nRaw: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

function killProcess(pid) {
  return new Promise((resolve, reject) => {
    const exe = getExePath();
    execFile(exe, ['--kill', String(pid)], (err, stdout, stderr) => {
      if (err) {
        // Fallback: try Windows taskkill if sysscope requires higher privileges or fails
        execFile('taskkill', ['/PID', String(pid), '/F'], (tkErr, tkOut, tkErrOut) => {
          if (tkErr) {
            return reject(new Error(stderr || tkErrOut || `Failed to kill process PID ${pid}`));
          }
          resolve({ success: true, message: `Terminated PID ${pid} via taskkill` });
        });
        return;
      }
      try {
        const res = JSON.parse(stdout);
        resolve(res);
      } catch {
        resolve({ success: true, message: `Terminated process PID ${pid}` });
      }
    });
  });
}

module.exports = {
  fetchProcessData,
  killProcess,
  getExePath
};
