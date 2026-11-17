import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  KEY_ID,
  formatSignature,
  parseSignature,
  signatureProblem,
  signedProvider,
} from '../updateSignature.cjs';

const keys = () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  return {
    privateKey,
    certificate: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
};
const trusted = keys();
const other = keys();

const YML = 'version: 99.0.0\npath: learnX-Setup-99.0.0.exe\nsha512: abc\n';
const signed = (data: string, key = trusted.privateKey, keyId = KEY_ID) =>
  formatSignature(sign('sha256', Buffer.from(data), key), keyId);

it('reads back what it writes, in the over-the-air signature’s shape', () => {
  const text = formatSignature(Buffer.from([1, 2, 3]));
  expect(text).toBe('sig="AQID", keyid="main"\n');
  expect(parseSignature(text)).toEqual({
    signature: Buffer.from([1, 2, 3]),
    keyId: 'main',
  });
  expect(parseSignature('AQID')).toBeNull();
  expect(parseSignature('<html>Not found</html>')).toBeNull();
});

it('accepts a signature by the trusted key', () => {
  expect(signatureProblem(YML, signed(YML), trusted.certificate)).toBeNull();
  expect(
    signatureProblem(Buffer.from(YML), signed(YML), trusted.certificate),
  ).toBeNull();
});

it('accepts the over-the-air certificate as the trusted key', () => {
  const certificate = readFileSync(
    path.join(__dirname, '..', '..', 'certs', 'ota-certificate.pem'),
  );
  // Not signed by its key, but read as one.
  expect(signatureProblem(YML, signed(YML), certificate)).toBe(
    'signature doesn’t match',
  );
});

it.each([
  ['a missing signature', null, 'no signature'],
  ['an empty one', '', 'no signature'],
  ['an unreadable one', 'garbage', 'unreadable signature'],
  ['another key', signed(YML, other.privateKey), 'signature doesn’t match'],
  [
    'a changed file',
    signed(YML.replace('abc', 'abd')),
    'signature doesn’t match',
  ],
  [
    'another key id',
    signed(YML, trusted.privateKey, 'other'),
    'signed with key "other", not "main"',
  ],
])('refuses %s', (_name, signature, problem) => {
  expect(signatureProblem(YML, signature, trusted.certificate)).toBe(problem);
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
    certificate: trusted.certificate,
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
