import DeviceInfo from 'constants/DeviceInfo';
import {
  canPreviewInline,
  canRenderInIosWebview,
  canRenderInMacWebview,
  needWhiteBackground,
} from 'helpers/filePreview';

jest.mock('constants/DeviceInfo', () => ({
  isMac: jest.fn(() => false),
  systemVersion: jest.fn(() => '26.1'),
}));

beforeEach(() => {
  jest.mocked(DeviceInfo.isMac).mockReturnValue(false);
  jest.mocked(DeviceInfo.systemVersion).mockReturnValue('26.1');
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

  it('needs macOS 17.1 or later', () => {
    jest.mocked(DeviceInfo.systemVersion).mockReturnValue('17.0');
    expect(canRenderInMacWebview('pdf')).toBe(false);
    jest.mocked(DeviceInfo.systemVersion).mockReturnValue('17.1');
    expect(canRenderInMacWebview('pdf')).toBe(true);
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

  it('always previews PDFs', () => {
    jest.mocked(DeviceInfo.isMac).mockReturnValue(true);
    jest.mocked(DeviceInfo.systemVersion).mockReturnValue('16.0');
    expect(canPreviewInline('pdf')).toBe(true);
  });
});
