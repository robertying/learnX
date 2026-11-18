// The update files' signatures. electron-updater trusts whatever latest.yml
// (latest-linux.yml, latest-linux-arm64.yml) the mirror serves: the installer
// is checked against the SHA-512 in it, and the builds carry no publisher
// signature. So each update file is signed at release time, on the
// maintainer's Mac, with learnX's own Ed25519 update key, into a detached
// `<file>.sig` next to it (scripts/release/sign-electron-update.mjs); the app carries
// the public half (certs/electron-public-key.pem). It reads an update file only
// through `signedProvider`, which refuses one without a valid signature: no
// update is offered, and the reason is logged.
const { createPublicKey, sign, verify } = require('node:crypto');

/** The signature's file name next to an update file's. */
const SIGNATURE_SUFFIX = '.sig';

/**
 * Whether a public key PEM is a placeholder (its first line says so), whose
 * private half no one holds: packaging and signing refuse one, so a
 * placeholder can't take the real key's place unnoticed.
 * @param {string | Buffer} publicKey
 */
const isPlaceholderKey = publicKey =>
  String(publicKey).trimStart().startsWith('PLACEHOLDER');

/**
 * A signature file's text for `data`: the Ed25519 signature in base64.
 * @param {Buffer} data
 * @param {string | Buffer} privateKey PEM
 */
const signUpdateFile = (data, privateKey) =>
  `${sign(null, data, privateKey).toString('base64')}\n`;

/**
 * Why `data` doesn't carry a valid signature by the public key, or null when
 * it does.
 *
 * @param {Buffer | string} data
 * @param {string | null | undefined} signatureText
 * @param {string | Buffer} publicKey PEM
 * @returns {string | null}
 */
const signatureProblem = (data, signatureText, publicKey) => {
  if (!signatureText) {
    return 'no signature';
  }
  const text = signatureText.trim();
  const signature = Buffer.from(text, 'base64');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text) || signature.length !== 64) {
    return 'unreadable signature';
  }
  const valid = verify(
    null,
    Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'),
    createPublicKey(publicKey),
    signature,
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
 *   publicKey: string | Buffer;
 * }} options
 */
const signedProvider = ({
  GenericProvider,
  parseUpdateInfo,
  getChannelFilename,
  newUrlFromBase,
  publicKey,
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
      const problem = signatureProblem(data ?? '', signatureText, publicKey);
      if (problem) {
        throw Object.assign(new Error(`${channelFile} refused: ${problem}`), {
          code: 'ERR_UPDATE_SIGNATURE',
        });
      }
      return parseUpdateInfo(data, channelFile, channelUrl);
    }
  };

module.exports = {
  SIGNATURE_SUFFIX,
  isPlaceholderKey,
  signUpdateFile,
  signatureProblem,
  signedProvider,
};
