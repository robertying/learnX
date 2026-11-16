import { render } from '@testing-library/react';
import FilePreview, { previewUrlOf } from 'web/FilePreview';
import Pdf from 'web/packages/Pdf';
import WebView from 'web/packages/WebView';
import {
  installBridge,
  uninstallBridge,
} from 'test-utils/mocks/electronBridge';

const roots = {
  cache: 'file:///data/Files/Caches/',
  document: 'file:///data/Files/Documents/',
};

beforeEach(() => {
  const bridge = installBridge();
  jest.mocked(bridge.files.sync).mockReturnValue({ result: roots } as never);
});

afterEach(() => {
  uninstallBridge();
});

const download = `${roots.cache}downloads/c/Lecture%201.pdf`;

it('maps the app’s files to the preview’s own origin', () => {
  expect(previewUrlOf(download)).toBe(
    'app://files/cache/downloads/c/Lecture%201.pdf',
  );
  expect(previewUrlOf(`${roots.document}drafts/a.png`)).toBe(
    'app://files/document/drafts/a.png',
  );
  expect(previewUrlOf('file:///elsewhere/a.pdf')).toBeNull();
  jest
    .mocked((globalThis as any).learnx.files.sync)
    .mockReturnValue({ error: 'no' });
  expect(previewUrlOf(download)).toBeNull();
});

it('shows a PDF in Chromium’s viewer and a picture fitted', () => {
  const { container, rerender } = render(<FilePreview uri={download} />);
  const frame = container.querySelector('iframe')!;
  expect(frame.getAttribute('src')).toBe(
    'app://files/cache/downloads/c/Lecture%201.pdf',
  );
  expect(frame.getAttribute('title')).toBe('Lecture 1.pdf');

  rerender(<FilePreview uri={`${roots.cache}a/diagram.PNG`} />);
  const image = container.querySelector('img')!;
  expect(image.getAttribute('src')).toBe('app://files/cache/a/diagram.PNG');
  expect(image.style.objectFit).toBe('contain');

  rerender(<FilePreview uri="file:///elsewhere/a.pdf" />);
  expect(container.querySelector('iframe,img')).toBeNull();
});

it('stands in for react-native-pdf and for a web view of a file', () => {
  const pdf = render(<Pdf source={{ uri: download }} />);
  expect(pdf.getByTestId('pdf-preview')).toBeTruthy();
  expect(pdf.container.querySelector('iframe')).toBeTruthy();

  const view = render(
    <WebView source={{ uri: `${roots.cache}a/diagram.png` }} />,
  );
  expect(view.container.querySelector('img')).toBeTruthy();
  expect(view.container.querySelector('webview')).toBeNull();
});
