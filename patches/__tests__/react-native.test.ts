// What patches/react-native@0.88.1.patch changes in FormData, which the
// assignment submission sends its files with.

type Part = { headers: Record<string, string> };
const RNFormData = jest.requireActual<{
  default: new () => {
    append(key: string, value: unknown): void;
    getParts(): Part[];
  };
}>('react-native/Libraries/Network/FormData').default;

const disposition = (name: string) => {
  const body = new RNFormData();
  body.append('file', { uri: 'file:///tmp/a', name, type: 'text/plain' });
  return body.getParts()[0].headers['content-disposition'];
};

it('sends the UTF-8 file name in filename, and percent-encoded in filename*', () => {
  expect(disposition('作业 1 (final).pdf')).toBe(
    `form-data; name="file"; filename="作业 1 (final).pdf"; filename*=utf-8''%E4%BD%9C%E4%B8%9A%201%20%28final%29.pdf`,
  );
});

it('escapes only what would end the quoted name or the header', () => {
  expect(disposition(`a"b\r\nc'*.txt`)).toBe(
    `form-data; name="file"; filename="a%22b%0D%0Ac'*.txt"; filename*=utf-8''a%22b%0D%0Ac%27%2A.txt`,
  );
});

it('leaves parts without a file name alone', () => {
  const body = new RNFormData();
  body.append('title', 'x');
  body.append('file', { uri: 'file:///tmp/a' });
  expect(body.getParts().map(part => part.headers)).toEqual([
    { 'content-disposition': 'form-data; name="title"' },
    { 'content-disposition': 'form-data; name="file"' },
  ]);
});
