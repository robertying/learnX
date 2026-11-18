// Waits, up to 30 seconds, until the app has asked the E2E APK mirror
// (UPDATER_SERVER) for latest.json more times than AFTER, and keeps its
// status in output.updater.
const after = Number(AFTER);
const deadline = Date.now() + 30000;
let status = json(http.get(`${UPDATER_SERVER}/status`).body);
while (status.latestChecks <= after && Date.now() < deadline) {
  status = json(http.get(`${UPDATER_SERVER}/status`).body);
}
if (status.latestChecks <= after) {
  throw new Error(`No update check: ${JSON.stringify(status)}`);
}
output.updater = status;
