// app.json plus the Expo project id from the repo-root .env (EXPO_PROJECT_ID),
// which `eoas publish` reads. The builds read it too (scripts/ota-config-ios.sh,
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
  ...(env.EXPO_PROJECT_ID && {
    extra: { eas: { projectId: env.EXPO_PROJECT_ID } },
  }),
});
