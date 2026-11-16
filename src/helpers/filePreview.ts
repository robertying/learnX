// Which downloaded files File detail can show inline, and how.
import { Platform } from 'react-native';
import mime from 'mime';
import DeviceInfo from 'constants/DeviceInfo';
import { isQuickLookAvailable } from 'modules/quicklook';

/** Word and Excel pages are drawn on white, also in dark mode. */
export const needWhiteBackground = (ext?: string | null) =>
  !!ext && ['doc', 'docx', 'xls', 'xlsx'].includes(ext);

/** What WebKit shows on every Apple platform: PDFs, images, media and text. */
const isWebKitType = (mimeType: string) =>
  mimeType === 'application/pdf' ||
  ['image/', 'audio/', 'video/', 'text/'].some(kind =>
    mimeType.startsWith(kind),
  );

/**
 * Office and iWork documents. iOS's web view converts them into pages, but the
 * Mac's shows their bytes, so the Mac shows them with Quick Look (AppKit's, from
 * the app's MacPreview plugin), or their info without it.
 */
const documentTypes = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.apple.pages',
  'application/vnd.apple.keynote',
  'application/vnd.apple.numbers',
]);

export type PreviewKind = 'pdf' | 'web' | 'quickLook';

/**
 * How File detail shows the downloaded file itself rather than its info, or
 * null when it can't: PDFs everywhere with the PDF viewer; on iOS and Mac,
 * what WebKit draws in the web view; Office and iWork documents in the web
 * view on iOS and with Quick Look on Mac, where it loaded.
 */
export const previewKind = (fileType?: string | null): PreviewKind | null => {
  if (fileType === 'pdf') {
    return 'pdf';
  }
  const mimeType = Platform.OS === 'ios' && fileType && mime.getType(fileType);
  if (!mimeType) {
    return null;
  }
  if (isWebKitType(mimeType)) {
    return 'web';
  }
  if (!documentTypes.has(mimeType)) {
    return null;
  }
  if (!DeviceInfo.isMac()) {
    return 'web';
  }
  return isQuickLookAvailable ? 'quickLook' : null;
};

/**
 * Whether the web view preview may show a load: the file itself, a blank
 * page, or the pages iOS's WebKit converts an Office or iWork document into
 * (`x-apple-ql-id:`). Anything else, like a web page a downloaded .html file
 * links or refreshes to, would look like part of learnX.
 */
export const isPreviewLoad = (url: string) =>
  /^(file|about|x-apple-ql-id):/i.test(url);
