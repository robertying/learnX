// Answers the Android flows' question "did learnX write this event to the
// calendar?": Maestro's scripts run on this machine and can make HTTP
// requests, but can't run adb, and the emulator's only calendar app (Google
// Calendar) needs a Google account. scripts/e2e.sh starts this for Android:
//
//   node scripts/e2e-calendar.mjs <adb serial> <port> <parent pid>
//
// GET /events?match=<regex>&found=true|false waits up to 15 s (the app writes
// in the background) for an event whose "title | location" matches the whole
// regex to be in the device's calendar (found=true) or gone from it, and
// answers "true" when it is so, "false" otherwise. It exits with its parent.
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';

const [serial, port, parent] = process.argv.slice(2);
if (!serial || !port || !parent) {
  console.error('usage: e2e-calendar.mjs <adb serial> <port> <parent pid>');
  process.exit(1);
}

/** The device's events that aren't deleted, as "title | location". */
const parseEvents = text =>
  text
    .split('\n')
    .map(line =>
      /^Row: \d+ title=(.*), eventLocation=(.*), deleted=(\d+)\s*$/.exec(line),
    )
    .filter(row => row && row[3] === '0')
    .map(row => `${row[1]} | ${row[2]}`);

const events = () =>
  new Promise(resolve => {
    execFile(
      'adb',
      [
        '-s',
        serial,
        'shell',
        'content',
        'query',
        '--uri',
        'content://com.android.calendar/events',
        '--projection',
        'title:eventLocation:deleted',
      ],
      (error, stdout) => resolve(error ? [] : parseEvents(stdout)),
    );
  });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const match = new RegExp(`^(?:${url.searchParams.get('match') ?? ''})$`);
  const found = url.searchParams.get('found') !== 'false';
  let answer = false;
  for (let i = 0; i < 15 && !answer; i++) {
    if (i > 0) {
      await sleep(1000);
    }
    answer = (await events()).some(event => match.test(event)) === found;
  }
  response.end(String(answer));
}).listen(Number(port), '127.0.0.1');

// Exit with scripts/e2e.sh.
setInterval(() => {
  try {
    process.kill(Number(parent), 0);
  } catch {
    process.exit(0);
  }
}, 2000).unref();
