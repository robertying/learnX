import { Platform } from 'react-native';
import { isPreviewLoad, previewKind } from 'helpers/filePreview';

describe('previewKind', () => {
  it('shows PDFs with the PDF viewer everywhere', () => {
    expect(previewKind('pdf')).toBe('pdf');
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(previewKind('pdf')).toBe('pdf');
  });

  it('shows what WebKit draws in the web view', () => {
    for (const ext of ['png', 'jpg', 'mp4', 'mp3', 'txt', 'html', 'svg']) {
      expect(previewKind(ext)).toBe('web');
    }
  });

  it('shows Office and iWork documents with Quick Look', () => {
    for (const ext of [
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'pages',
      'key',
      'numbers',
    ]) {
      expect(previewKind(ext)).toBe('quickLook');
    }
  });

  it('shows the info of anything else', () => {
    expect(previewKind('zip')).toBeNull();
    expect(previewKind('nope')).toBeNull();
    expect(previewKind('')).toBeNull();
    expect(previewKind(null)).toBeNull();
    expect(previewKind(undefined)).toBeNull();
  });

  it('previews only PDFs on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(previewKind('png')).toBeNull();
    expect(previewKind('docx')).toBeNull();
  });
});

describe('isPreviewLoad', () => {
  it('allows the file itself and a blank page', () => {
    expect(isPreviewLoad('file:///Caches/downloads/c/f/a.html')).toBe(true);
    expect(isPreviewLoad('about:blank')).toBe(true);
  });

  it('refuses web pages and other schemes', () => {
    expect(isPreviewLoad('https://id.tsinghua.edu.cn/login')).toBe(false);
    expect(isPreviewLoad('http://example.com')).toBe(false);
    expect(isPreviewLoad('data:text/html,<form>')).toBe(false);
    expect(isPreviewLoad('mailto:ta@example.com')).toBe(false);
  });
});
