// Lists the booted iOS simulators from `xcrun simctl list -j devices runtimes`
// on stdin, one per line: <iOS version> <iPad: true|false> <UDID> <name>,
// tab-separated. With a device (a name or UDID), only that one. JSON, because
// the text listing's layout changes between Xcode releases (Xcode 27 heads it
// with "== Devices ==").
// Usage: xcrun simctl list -j devices runtimes |
//   node scripts/e2e/lib/booted-sims.mjs [device]
const [device] = process.argv.slice(2);

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;

const { devices = {}, runtimes = [] } = JSON.parse(input);
for (const [runtime, list] of Object.entries(devices)) {
  // com.apple.CoreSimulator.SimRuntime.iOS-27-2, or a runtime made for one
  // device type, as the iPhone Duo's iOS-27-2-iPhone19-4; not watchOS, tvOS
  // or visionOS.
  const match = /\.iOS-(\d+(?:-\d+)*)(?:-[A-Za-z][\w-]*)?$/.exec(runtime);
  if (!match) continue;
  const version =
    runtimes.find(r => r.identifier === runtime)?.version ??
    match[1].replaceAll('-', '.');
  for (const sim of list) {
    if (sim.state !== 'Booted') continue;
    if (device && sim.udid !== device && sim.name !== device) continue;
    const ipad = /iPad/.test(sim.deviceTypeIdentifier ?? sim.name);
    console.log([version, ipad, sim.udid, sim.name].join('\t'));
  }
}
