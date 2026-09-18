// Runs every test file in parallel instead of one after another (they are
// independent Node processes with no shared state), then reports pass/fail
// per file. Keeps each file's own console output grouped and readable.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.cjs') && f !== 'run-all.cjs').sort();

function run(file) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(dir, file)], { cwd: path.join(dir, '..') });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => resolve({ file, code, out, err }));
  });
}

(async () => {
  const start = Date.now();
  const results = await Promise.all(files.map(run));
  let failed = false;
  for (const r of results) {
    process.stdout.write('== ' + r.file + ' ==\n' + r.out);
    if (r.code !== 0) {
      failed = true;
      process.stderr.write('== ' + r.file + ' FAILED (exit ' + r.code + ') ==\n' + r.err);
    }
  }
  console.log((failed ? 'FAILED' : 'All tests passed') + ' in ' + ((Date.now() - start) / 1000).toFixed(1) + 's');
  process.exit(failed ? 1 : 0);
})();
