import { getScriptNonce, getTappedLink } from 'helpers/webContent';

describe('getScriptNonce', () => {
  it('stays the same for the launch', () => {
    expect(getScriptNonce()).toMatch(/^[0-9a-f]{32}$/);
    expect(getScriptNonce()).toBe(getScriptNonce());
  });
});

describe('getTappedLink', () => {
  const message = (fields: object) =>
    JSON.stringify({ type: 'link', key: getScriptNonce(), ...fields });

  it("reads a tap the template's script reported", () => {
    expect(getTappedLink(message({ url: 'https://example.com' }))).toBe(
      'https://example.com',
    );
  });

  it('ignores heights, other messages and taps without the key', () => {
    expect(getTappedLink('320')).toBeUndefined();
    expect(getTappedLink('not json')).toBeUndefined();
    expect(getTappedLink('null')).toBeUndefined();
    expect(getTappedLink(message({ key: 'guess', url: 'https://x' }))).toBe(
      undefined,
    );
    expect(getTappedLink(message({ type: 'other', url: 'https://x' }))).toBe(
      undefined,
    );
    expect(getTappedLink(message({ url: 42 }))).toBeUndefined();
  });
});
