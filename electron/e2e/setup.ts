// Before the whole run: downloads Electron (and on a Mac builds the renamed
// dev app) once, so workers that launch apps at the same time don't each
// start the download and run a binary another one is still writing
// (`spawn ETXTBSY`), and strips the preloads, so the dev apps the workers
// launch find them as stripped and never replace a file another app has open
// (preloads.ts). A packaged app needs none of it.
import { electronExecutable } from '../electronApp.ts';
import { stripPreloads } from '../preloads.ts';

export default function setup() {
  // fixtures.ts's packagedApp; importing it here would load Playwright's
  // fixtures outside a test run.
  if (!process.env.LEARNX_E2E_APP) {
    electronExecutable();
    stripPreloads();
  }
}
