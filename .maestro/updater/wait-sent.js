// Waits, up to 30 seconds, until the E2E APK mirror (UPDATER_SERVER) has
// sent more APKs in full than AFTER, and keeps its status in output.updater.
const after = Number(AFTER);
const deadline = Date.now() + 30000;
let status = json(http.get(`${UPDATER_SERVER}/status`).body);
while (status.apkSent <= after && Date.now() < deadline) {
  status = json(http.get(`${UPDATER_SERVER}/status`).body);
}
if (status.apkSent <= after) {
  throw new Error(`No APK sent in full: ${JSON.stringify(status)}`);
}
output.updater = status;
