// Before the whole run: downloads Electron (and on a Mac builds the renamed
// dev app) once, so workers that launch apps at the same time don't each
// start the download and run a binary another one is still writing
// (`spawn ETXTBSY`). A packaged app needs neither.
import { electronExecutable } from '../electronApp.cjs';

export default function setup() {
  // fixtures.ts's packagedApp; importing it here would load Playwright's
  // fixtures outside a test run.
  if (!process.env.LEARNX_E2E_APP) {
    electronExecutable();
  }
}
