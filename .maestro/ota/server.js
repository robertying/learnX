// Calls the E2E update server (scripts/ota-e2e-server.mjs) at OTA_SERVER and
// keeps its status in output.ota (with `short`, the update id as About shows
// it). PATH_ is the request: /mode/<mode>, /status or /wait?for=…&after=N.
const response = http.get(`${OTA_SERVER}${PATH_}`);
if (response.status !== 200) {
  throw new Error(`${PATH_}: ${response.status} ${response.body}`);
}
const answer = json(response.body);
if (answer.id) {
  answer.short = answer.id.slice(0, 8);
}
output.ota = Object.assign(output.ota || {}, answer);
