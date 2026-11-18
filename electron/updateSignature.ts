// The update files' signatures. electron-updater trusts whatever latest.yml
// (latest-linux.yml, latest-linux-arm64.yml) the mirror serves: the installer
// is checked against the SHA-512 in it, and the builds carry no publisher
// signature. So each update file is signed at release time, on the
// maintainer's Mac, with learnX's own Ed25519 update key, into a detached
// `<file>.sig` next to it (scripts/release/sign-electron-update.mjs); the app carries
// the public half (certs/electron-public-key.pem). It reads an update file only
// through `signedProvider`, which refuses one without a valid signature: no
// update is offered, and the reason is logged.
import { createPublicKey, sign, verify } from 'node:crypto';

/** The signature's file name next to an update file's. */
export const SIGNATURE_SUFFIX = '.sig';

/**
 * Whether a public key PEM is a placeholder (its first line says so), whose
 * private half no one holds: packaging and signing refuse one, so a
 * placeholder can't take the real key's place unnoticed.
 */
export const isPlaceholderKey = (publicKey: string | Buffer): boolean =>
  String(publicKey).trimStart().startsWith('PLACEHOLDER');

/**
 * A signature file's text for `data`: the Ed25519 signature in base64.
 * @param privateKey PEM
 */
export const signUpdateFile = (
  data: Buffer,
  privateKey: string | Buffer,
): string => `${sign(null, data, privateKey).toString('base64')}\n`;

/**
 * Why `data` doesn't carry a valid signature by the public key, or null when
 * it does.
 * @param publicKey PEM
 */
export const signatureProblem = (
  data: Buffer | string,
  signatureText: string | null | undefined,
  publicKey: string | Buffer,
): string | null => {
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
 * valid signature: an error otherwise, which the updater logs (updater.ts).
 * Takes electron-updater's pieces as arguments, so tests can give stand-ins.
 */
export const signedProvider = ({
  GenericProvider,
  parseUpdateInfo,
  getChannelFilename,
  newUrlFromBase,
  publicKey,
}: {
  // The provider's fields it reads (`channel`, `updater`, `baseUrl`,
  // `httpRequest`) are private in electron-updater's types.
  GenericProvider: new (...args: any[]) => any;
  parseUpdateInfo: (
    rawData: string | null,
    channelFile: string,
    channelFileUrl: URL,
  ) => unknown;
  getChannelFilename: (channel: string) => string;
  newUrlFromBase: (
    pathname: string,
    baseUrl: URL,
    addRandomQueryToAvoidCaching?: boolean,
  ) => URL;
  publicKey: string | Buffer;
}) =>
  class SignedProvider extends GenericProvider {
    async getLatestVersion() {
      const channelFile = getChannelFilename(this.channel as string);
      // Both from the same moment's copy: a cached update file with a fresh
      // signature would fail, and be tried again later.
      const noCache = this.updater.isAddNoCacheQuery as boolean;
      const baseUrl = this.baseUrl as URL;
      const channelUrl = newUrlFromBase(channelFile, baseUrl, noCache);
      const signatureUrl = newUrlFromBase(
        channelFile + SIGNATURE_SUFFIX,
        baseUrl,
        noCache,
      );
      const data: string | null = await this.httpRequest(channelUrl);
      let signatureText: string | null = null;
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
