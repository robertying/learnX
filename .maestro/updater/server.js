// Calls the E2E APK mirror (scripts/e2e/updater-e2e-server.mjs) at UPDATER_SERVER
// and keeps its status in output.updater. PATH_ is the request: /mode/<mode>
// or /status.
const response = http.get(`${UPDATER_SERVER}${PATH_}`);
if (response.status !== 200) {
  throw new Error(`${PATH_}: ${response.status} ${response.body}`);
}
output.updater = json(response.body);
