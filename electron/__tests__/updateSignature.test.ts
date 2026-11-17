import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  isPlaceholderKey,
  signUpdateFile,
  signatureProblem,
  signedProvider,
} from '../updateSignature.cjs';

const keys = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
};
const trusted = keys();
const other = keys();

const YML = 'version: 99.0.0\npath: learnX-windows-v99.0.0.exe\nsha512: abc\n';
const signed = (data: string, key = trusted.privateKey) =>
  signUpdateFile(Buffer.from(data), key);

it('writes the signature as base64 on a line of its own', () => {
  expect(signed(YML)).toMatch(/^[A-Za-z0-9+/]{86}==\n$/);
});

it('accepts a signature by the trusted key', () => {
  expect(signatureProblem(YML, signed(YML), trusted.publicKey)).toBeNull();
  expect(
    signatureProblem(Buffer.from(YML), signed(YML), trusted.publicKey),
  ).toBeNull();
});

it.each([
  ['a missing signature', null, 'no signature'],
  ['an empty one', '', 'no signature'],
  ['an unreadable one', 'garbage!', 'unreadable signature'],
  ['a page instead', '<html>Not found</html>', 'unreadable signature'],
  ['one too short', 'AQID', 'unreadable signature'],
  ['another key’s', signed(YML, other.privateKey), 'signature doesn’t match'],
  [
    'a changed file’s',
    signed(YML.replace('abc', 'abd')),
    'signature doesn’t match',
  ],
  [
    'an RSA one (the over-the-air key’s kind)',
    sign(
      'sha256',
      Buffer.from(YML),
      generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey,
    ).toString('base64'),
    'unreadable signature',
  ],
])('refuses %s', (_name, signature, problem) => {
  expect(signatureProblem(YML, signature, trusted.publicKey)).toBe(problem);
});

it('trusts only the committed key, and knows a placeholder', () => {
  const committed = readFileSync(
    path.join(__dirname, '..', '..', 'certs', 'electron-update.pem'),
    'utf8',
  );
  // Nothing a throwaway key signs passes the committed key.
  expect(signatureProblem(YML, signed(YML), committed)).toBe(
    'signature doesn’t match',
  );
  expect(isPlaceholderKey(`PLACEHOLDER: x\n${trusted.publicKey}`)).toBe(true);
  expect(isPlaceholderKey(trusted.publicKey)).toBe(false);
});

describe('signedProvider', () => {
  /** electron-updater's generic provider, as far as the subclass uses it. */
  class FakeGenericProvider {
    channel = 'latest';
    baseUrl = new URL('https://mirror.test/LatestRelease/');
    updater = { isAddNoCacheQuery: false };
    constructor(public served: Record<string, string | Error>) {}
    httpRequest = jest.fn(async (url: URL) => {
      const body = this.served[url.pathname.split('/').pop()!];
      if (body instanceof Error || body === undefined) {
        throw body ?? new Error('404');
      }
      return body;
    });
  }
  const parseUpdateInfo = jest.fn((data: string | null) => ({ data }));
  const Provider = signedProvider({
    GenericProvider: FakeGenericProvider,
    parseUpdateInfo,
    getChannelFilename: channel => `${channel}.yml`,
    newUrlFromBase: (name, base) => new URL(name, base),
    publicKey: trusted.publicKey,
  });

  it('reads a signed update file', async () => {
    const provider = new Provider({
      'latest.yml': YML,
      'latest.yml.sig': signed(YML),
    });
    await expect(provider.getLatestVersion()).resolves.toEqual({ data: YML });
    expect(parseUpdateInfo).toHaveBeenCalledWith(
      YML,
      'latest.yml',
      new URL('https://mirror.test/LatestRelease/latest.yml'),
    );
  });

  it.each([
    ['unsigned', { 'latest.yml': YML }, 'no signature'],
    [
      'signed by another key',
      {
        'latest.yml': YML,
        'latest.yml.sig': signed(YML, other.privateKey),
      },
      'signature doesn’t match',
    ],
    [
      'changed after signing',
      {
        'latest.yml': YML.replace('abc', 'evil'),
        'latest.yml.sig': signed(YML),
      },
      'signature doesn’t match',
    ],
  ])('refuses an update file %s', async (_name, served, problem) => {
    const provider = new Provider(served);
    await expect(provider.getLatestVersion()).rejects.toMatchObject({
      message: `latest.yml refused: ${problem}`,
      code: 'ERR_UPDATE_SIGNATURE',
    });
    expect(parseUpdateInfo).not.toHaveBeenCalled();
  });

  it('passes on a failure to read the update file', async () => {
    const provider = new Provider({ 'latest.yml': new Error('offline') });
    await expect(provider.getLatestVersion()).rejects.toThrow('offline');
  });
});
