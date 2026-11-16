import { Platform } from 'react-native';
import DeviceInfo from 'constants/DeviceInfo';
import {
  canPreviewInline,
  canRenderInElectron,
  canRenderInIosWebview,
  canRenderInMacWebview,
  isPreviewLoad,
  needWhiteBackground,
} from 'helpers/filePreview';

jest.mock('constants/DeviceInfo', () => ({
  isMac: jest.fn(() => false),
}));

beforeEach(() => {
  jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
});

describe('needWhiteBackground', () => {
  it('is on for Word and Excel files only', () => {
    expect(needWhiteBackground('docx')).toBe(true);
    expect(needWhiteBackground('xls')).toBe(true);
    expect(needWhiteBackground('pdf')).toBe(false);
    expect(needWhiteBackground(null)).toBe(false);
  });
});

describe('canRenderInIosWebview', () => {
  it('renders Office, iWork, PDF and media files', () => {
    for (const ext of [
      'docx',
      'pptx',
      'xlsx',
      'key',
      'pdf',
      'png',
      'mp4',
      'txt',
    ]) {
      expect(canRenderInIosWebview(ext)).toBe(true);
    }
  });

  it('does not render archives or unknown types', () => {
    expect(canRenderInIosWebview('zip')).toBe(false);
    expect(canRenderInIosWebview('nope')).toBe(false);
    expect(canRenderInIosWebview(undefined)).toBe(false);
  });
});

describe('canRenderInMacWebview', () => {
  it('renders PDF and media but not Office files', () => {
    expect(canRenderInMacWebview('pdf')).toBe(true);
    expect(canRenderInMacWebview('jpg')).toBe(true);
    expect(canRenderInMacWebview('docx')).toBe(false);
  });

  it('does not render archives or unknown types', () => {
    expect(canRenderInMacWebview('zip')).toBe(false);
    expect(canRenderInMacWebview('nope')).toBe(false);
    expect(canRenderInMacWebview(null)).toBe(false);
  });
});

describe('canPreviewInline', () => {
  it('uses the iOS web view on iPhone and iPad', () => {
    expect(canPreviewInline('docx')).toBe(true);
    expect(canPreviewInline('zip')).toBe(false);
  });

  it('uses the Mac web view on Mac', () => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    expect(canPreviewInline('docx')).toBe(false);
    expect(canPreviewInline('png')).toBe(true);
  });

  it('shows PDFs and pictures in the Electron app', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(canPreviewInline('png')).toBe(true);
    expect(canPreviewInline('JPG')).toBe(true);
    expect(canPreviewInline('svg')).toBe(false);
    expect(canPreviewInline('docx')).toBe(false);
    expect(canPreviewInline(null)).toBe(false);
    expect(canRenderInElectron('pdf')).toBe(true);
    expect(canRenderInElectron(undefined)).toBe(false);
  });

  it('always previews PDFs', () => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    expect(canPreviewInline('pdf')).toBe(true);
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
