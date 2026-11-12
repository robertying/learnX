// Copies the Mac store screenshots out of the attachments exported from the
// StoreScreenshots UI test (`xcresulttool export attachments`), naming each
// after its attachment ("01-notices_0_<uuid>.png" -> 01-notices.png).
// Usage: node scripts/lib/mac-store-shots.mjs <export dir> <output dir>
import { copyFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, out] = process.argv.slice(2);
/** @type {{ attachments: { suggestedHumanReadableName: string, exportedFileName: string }[] }[]} */
const tests = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
for (const test of tests) {
  for (const attachment of test.attachments) {
    const name = attachment.suggestedHumanReadableName.split('_')[0];
    copyFileSync(
      join(dir, attachment.exportedFileName),
      join(out, `${name}.png`),
    );
  }
}
