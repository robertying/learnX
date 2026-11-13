// What patches/whatwg-fetch@3.6.20.patch changes in the fetch React Native
// installs (Metro resolves `require('whatwg-fetch')` to the UMD build).

class FakeXMLHttpRequest {
  static status = 0;
  status = FakeXMLHttpRequest.status;
  statusText = '';
  responseURL = 'https://learn.tsinghua.edu.cn/';
  responseText = '';
  onload = () => {};
  open() {}
  setRequestHeader() {}
  getAllResponseHeaders() {
    return '';
  }
  send() {
    this.onload();
  }
}

const { fetch: polyfillFetch } = jest.requireActual<{
  fetch: typeof globalThis.fetch;
}>('whatwg-fetch/dist/fetch.umd.js');

const realXMLHttpRequest = globalThis.XMLHttpRequest;
beforeAll(() => {
  globalThis.XMLHttpRequest =
    FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
});
afterAll(() => {
  globalThis.XMLHttpRequest = realXMLHttpRequest;
});

it('rejects a response with status 0 instead of throwing in a timer', async () => {
  FakeXMLHttpRequest.status = 0;
  await expect(polyfillFetch('https://learn.tsinghua.edu.cn/')).rejects.toEqual(
    new TypeError('Network request failed'),
  );
});

it('still resolves a response in range', async () => {
  FakeXMLHttpRequest.status = 200;
  await expect(
    polyfillFetch('https://learn.tsinghua.edu.cn/'),
  ).resolves.toMatchObject({ status: 200, ok: true });
});
