// Preloaded into eoas by scripts/ota-publish.sh (NODE_OPTIONS=--require).
// eoas sends its credentials with a file upload only when the upload URL
// starts with the server URL it was given. That is the SSH tunnel
// (OTA_LOCAL_ORIGIN), while the server hands out upload URLs on its public
// origin (OTA_PUBLIC_ORIGIN, its BASE_URL), where the upload route still
// demands those credentials. This points the upload URLs in the server's JSON
// answers at the tunnel, so the files go through it with the credentials.
const Module = require('module');

const PUBLIC = process.env.OTA_PUBLIC_ORIGIN;
const LOCAL = process.env.OTA_LOCAL_ORIGIN;
const APP_ID = process.env.OTA_APP_ID;

if (PUBLIC && LOCAL && APP_ID) {
  const from = `${PUBLIC}/${APP_ID}/uploadLocalFile`;
  const to = `${LOCAL}/${APP_ID}/uploadLocalFile`;
  const load = Module._load;
  Module._load = function (request, ...rest) {
    const loaded = load.call(this, request, ...rest);
    const Response = request === 'node-fetch' && loaded && loaded.Response;
    if (Response && !Response.prototype.__otaTunnel) {
      Response.prototype.__otaTunnel = true;
      Response.prototype.json = async function () {
        return JSON.parse((await this.text()).split(from).join(to));
      };
    }
    return loaded;
  };
}
