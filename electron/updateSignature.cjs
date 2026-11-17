// The update files' signatures. electron-updater trusts whatever latest.yml
// (latest-linux.yml, latest-linux-arm64.yml) the mirror serves: the installer
// is checked against the SHA-512 in it, and the builds carry no publisher
// signature. So each update file is signed at release time, on the
// maintainer's Mac, with the over-the-air updates' code-signing key
// (certs/ota-certificate.pem, keyid `main`, RSA PKCS#1 v1.5 with SHA-256),
// into a detached `<file>.sig` next to it (scripts/sign-update-files.mjs).
// The app reads the update file only through `signedProvider`, which refuses
// one without a valid signature: no update is offered, and the reason is
// logged.
const { createPublicKey, verify } = require('node:crypto');

/** The signature's file name next to an update file's. */
const SIGNATURE_SUFFIX = '.sig';
/** The key the over-the-air updates' certificate names. */
const KEY_ID = 'main';

/**
 * A signature file's text: the same shape as the `expo-signature` header the
 * over-the-air updates carry.
 */
const formatSignature = (
  /** @type {Buffer} */ signature,
  /** @type {string} */ keyId = KEY_ID,
) => `sig="${signature.toString('base64')}", keyid="${keyId}"\n`;

/**
 * The signature and key id in a signature file's text, or null when it
 * isn't one.
 *
 * @returns {{ signature: Buffer; keyId: string } | null}
 */
const parseSignature = (/** @type {string} */ text) => {
  const match = /^sig="([A-Za-z0-9+/]+={0,2})", keyid="([\w-]+)"\s*$/.exec(
    text,
  );
  return match
    ? { signature: Buffer.from(match[1], 'base64'), keyId: match[2] }
    : null;
};

/**
 * Why `data` doesn't carry a valid signature by the certificate's key, or
 * null when it does.
 *
 * @param {Buffer | string} data
 * @param {string | null | undefined} signatureText
 * @param {string | Buffer} certificate a PEM certificate or public key
 * @returns {string | null}
 */
const signatureProblem = (data, signatureText, certificate) => {
  if (!signatureText) {
    return 'no signature';
  }
  const parsed = parseSignature(signatureText);
  if (!parsed) {
    return 'unreadable signature';
  }
  if (parsed.keyId !== KEY_ID) {
    return `signed with key "${parsed.keyId}", not "${KEY_ID}"`;
  }
  const valid = verify(
    'sha256',
    Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'),
    createPublicKey(certificate),
    parsed.signature,
  );
  return valid ? null : 'signature doesn’t match';
};

/**
 * electron-updater's generic provider, reading the update file only with a
 * valid signature: an error otherwise, which the updater logs (updater.cjs).
 * Takes electron-updater's pieces as arguments, so tests can give stand-ins.
 *
 * @param {{
 *   GenericProvider: new (...args: any[]) => any;
 *   parseUpdateInfo: (rawData: string | null, channelFile: string, channelFileUrl: URL) => unknown;
 *   getChannelFilename: (channel: string) => string;
 *   newUrlFromBase: (pathname: string, baseUrl: URL, addRandomQueryToAvoidCaching?: boolean) => URL;
 *   certificate: string | Buffer;
 * }} options
 */
const signedProvider = ({
  GenericProvider,
  parseUpdateInfo,
  getChannelFilename,
  newUrlFromBase,
  certificate,
}) =>
  class SignedProvider extends GenericProvider {
    async getLatestVersion() {
      const channelFile = getChannelFilename(this.channel);
      // Both from the same moment's copy: a cached update file with a fresh
      // signature would fail, and be tried again later.
      const noCache = this.updater.isAddNoCacheQuery;
      const channelUrl = newUrlFromBase(channelFile, this.baseUrl, noCache);
      const signatureUrl = newUrlFromBase(
        channelFile + SIGNATURE_SUFFIX,
        this.baseUrl,
        noCache,
      );
      const data = await this.httpRequest(channelUrl);
      /** @type {string | null} */
      let signatureText = null;
      try {
        signatureText = await this.httpRequest(signatureUrl);
      } catch {
        // No signature (a 404), refused below.
      }
      const problem = signatureProblem(data ?? '', signatureText, certificate);
      if (problem) {
        throw Object.assign(new Error(`${channelFile} refused: ${problem}`), {
          code: 'ERR_UPDATE_SIGNATURE',
        });
      }
      return parseUpdateInfo(data, channelFile, channelUrl);
    }
  };

module.exports = {
  KEY_ID,
  SIGNATURE_SUFFIX,
  formatSignature,
  parseSignature,
  signatureProblem,
  signedProvider,
};
