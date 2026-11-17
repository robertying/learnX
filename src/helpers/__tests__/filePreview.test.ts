import { Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import * as quickLook from 'modules/quicklook';
import {
  canRenderInElectron,
  isPreviewLoad,
  needWhiteBackground,
  previewKind,
} from 'helpers/filePreview';

jest.mock('constants/DeviceInfo', () => ({
  isMac: jest.fn(() => false),
}));

beforeEach(() => {
  jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
});

const documents = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'pages',
  'key',
  'numbers',
];

describe('needWhiteBackground', () => {
  it('is on for Word and Excel files only', () => {
    expect(needWhiteBackground('docx')).toBe(true);
    expect(needWhiteBackground('xls')).toBe(true);
    expect(needWhiteBackground('pptx')).toBe(false);
    expect(needWhiteBackground('pdf')).toBe(false);
    expect(needWhiteBackground(null)).toBe(false);
  });
});

describe('previewKind', () => {
  it('shows PDFs with the PDF viewer everywhere', () => {
    expect(previewKind('pdf')).toBe('pdf');
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    expect(previewKind('pdf')).toBe('pdf');
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(previewKind('pdf')).toBe('pdf');
  });

  it('shows what WebKit draws in the web view on iOS and Mac', () => {
    for (const ext of ['png', 'jpg', 'mp4', 'mp3', 'txt', 'html', 'svg']) {
      expect(previewKind(ext)).toBe('web');
    }
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    expect(previewKind('png')).toBe('web');
  });

  it("shows Office and iWork documents in iOS's web view", () => {
    for (const ext of documents) {
      expect(previewKind(ext)).toBe('web');
    }
  });

  it('shows Office and iWork documents with Quick Look on Mac', () => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    jest.replaceProperty(
      jest.requireMock<typeof quickLook>('modules/quicklook'),
      'isQuickLookAvailable',
      true,
    );
    for (const ext of documents) {
      expect(previewKind(ext)).toBe('quickLook');
    }
  });

  it('shows PDFs and pictures in the Electron app', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(previewKind('pdf')).toBe('pdf');
    expect(previewKind('png')).toBe('web');
    expect(previewKind('JPG')).toBe('web');
    expect(previewKind('svg')).toBeNull();
    expect(previewKind('docx')).toBeNull();
    expect(previewKind(null)).toBeNull();
    expect(canRenderInElectron('pdf')).toBe(true);
    expect(canRenderInElectron(undefined)).toBe(false);
  });

  it("shows the info of Office and iWork documents on a Mac without Quick Look's plugin", () => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    for (const ext of documents) {
      expect(previewKind(ext)).toBeNull();
    }
    expect(previewKind('png')).toBe('web');
  });

  it('shows the info of anything else', () => {
    expect(previewKind('zip')).toBeNull();
    expect(previewKind('nope')).toBeNull();
    expect(previewKind('')).toBeNull();
    expect(previewKind(null)).toBeNull();
    expect(previewKind(undefined)).toBeNull();
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    expect(previewKind('zip')).toBeNull();
  });

  it('previews only PDFs on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(previewKind('png')).toBeNull();
    expect(previewKind('docx')).toBeNull();
  });
});

describe('isPreviewLoad', () => {
  it('lets the file, a blank page and converted documents load', () => {
    expect(isPreviewLoad('file:///Caches/downloads/c/f/a.html')).toBe(true);
    expect(isPreviewLoad('about:blank')).toBe(true);
    expect(isPreviewLoad('x-apple-ql-id://abc/a.docx')).toBe(true);
  });

  it('keeps web pages and other schemes out', () => {
    expect(isPreviewLoad('https://id.tsinghua.edu.cn/login')).toBe(false);
    expect(isPreviewLoad('http://example.com')).toBe(false);
    expect(isPreviewLoad('data:text/html,<form>')).toBe(false);
    expect(isPreviewLoad('mailto:ta@example.com')).toBe(false);
  });
});
