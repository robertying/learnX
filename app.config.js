// app.json plus the over-the-air update settings from the repo-root .env
// (OTA_UPDATE_URL, EXPO_PROJECT_ID), which `eoas publish` reads: the server
// isn't in the repo. The builds read the same keys (scripts/ota-config-ios.sh,
// android/app/build.gradle).
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFile = path.join(__dirname, '.env');
const env = fs.existsSync(envFile)
  ? dotenv.parse(fs.readFileSync(envFile))
  : {};

/** @param {{ config: Record<string, unknown> }} context */
module.exports = ({ config }) => ({
  ...config,
  ...(env.OTA_UPDATE_URL && { updates: { url: env.OTA_UPDATE_URL } }),
  ...(env.EXPO_PROJECT_ID && {
    extra: { eas: { projectId: env.EXPO_PROJECT_ID } },
  }),
});
