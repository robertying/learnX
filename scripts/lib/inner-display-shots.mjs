// Serves the store flows' screenshots of an iPhone Duo's inner display, which
// Maestro's takeScreenshot captures black: GET /shot?name=<name> saves display
// 3 of the simulator to <output dir>/<name>.png with simctl. Listens on a free
// local port and writes it to <port file>.
// Usage: node scripts/lib/inner-display-shots.mjs <udid> <output dir> <port file>
import { execFile } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const [device, out, portFile] = process.argv.slice(2);
const server = createServer((req, res) => {
  const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get(
    'name',
  );
  if (!name || !/^[\w.-]+$/.test(name)) {
    res.writeHead(400).end();
    return;
  }
  execFile(
    'xcrun',
    [
      'simctl',
      'io',
      device,
      'screenshot',
      '--display=3',
      join(out, `${name}.png`),
    ],
    { timeout: 30000 },
    err => {
      res.writeHead(err ? 500 : 200).end(err ? String(err) : 'ok');
    },
  );
});
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address === 'object') {
    writeFileSync(portFile, String(address.port));
  }
});
