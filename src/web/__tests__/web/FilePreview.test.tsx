import { render } from '@testing-library/react';
import FilePreview, { previewUrlOf } from 'web/FilePreview';
import { PdfView } from 'modules/pdf';
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
  // Before the main process has said where the folders are (asked once).
  jest
    .mocked((globalThis as any).learnx.files.sync)
    .mockReturnValueOnce({ error: 'no' });
  expect(previewUrlOf(download)).toBeNull();
  expect(previewUrlOf(download)).toBe(
    'app://files/cache/downloads/c/Lecture%201.pdf',
  );
  expect(previewUrlOf(`${roots.document}drafts/a.png`)).toBe(
    'app://files/document/drafts/a.png',
  );
  expect(previewUrlOf('file:///elsewhere/a.pdf')).toBeNull();
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
  expect(image.getAttribute('alt')).toBe('diagram.PNG');

  rerender(<FilePreview uri="file:///elsewhere/a.pdf" />);
  expect(container.querySelector('iframe,img')).toBeNull();
});

it('shows a PDF and a web view of a file', () => {
  const pdf = render(<PdfView uri={download} />);
  expect(pdf.getByTestId('pdf-preview')).toBeTruthy();
  expect(pdf.container.querySelector('iframe')).toBeTruthy();

  const view = render(
    <WebView source={{ uri: `${roots.cache}a/diagram.png` }} />,
  );
  expect(view.container.querySelector('img')).toBeTruthy();
  expect(view.container.querySelector('webview')).toBeNull();
});
