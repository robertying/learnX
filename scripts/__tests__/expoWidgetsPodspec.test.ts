// What patches/expo-widgets@58.0.27.patch changes in ExpoWidgets.podspec:
// the resource script phase names its files through PODS_TARGET_SRCROOT
// instead of the folder the podspec was read from, so the spec's checksum in
// ios/Podfile.lock is the same in every checkout.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const podspec = readFileSync(
  join(__dirname, '../../node_modules/expo-widgets/ios/ExpoWidgets.podspec'),
  'utf8',
);

test('the resource script phase uses no absolute path', () => {
  const copyPhase = podspec.slice(
    podspec.indexOf('copy_bundle_script = {'),
    podspec.indexOf('s.script_phases'),
  );
  expect(copyPhase).not.toContain('__dir__');
  expect(copyPhase).toContain(
    '${PODS_TARGET_SRCROOT}/../bundle/build/ExpoWidgets.bundle',
  );
});
