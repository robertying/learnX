// Which downloaded files File detail can show inline, and how.
import { Platform } from 'react-native';
import mime from 'mime';
import DeviceInfo from 'constants/DeviceInfo';

/** Word and Excel pages are drawn on white, also in dark mode. */
export const needWhiteBackground = (ext?: string | null) =>
  !!ext && ['doc', 'docx', 'xls', 'xlsx'].includes(ext);

/** What WebKit shows on every Apple platform: PDFs, images, media and text. */
const isWebKitType = (mimeType: string) =>
  mimeType === 'application/pdf' ||
  ['image/', 'audio/', 'video/', 'text/'].some(kind =>
    mimeType.startsWith(kind),
  );

/** Office and iWork documents, which only iOS's web view renders (not Mac's). */
const iosDocumentTypes = new Set([
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

export const canRenderInMacWebview = (ext?: string | null) => {
  const mimeType = ext && mime.getType(ext);
  return !!mimeType && isWebKitType(mimeType);
};

export const canRenderInIosWebview = (ext?: string | null) => {
  const mimeType = ext && mime.getType(ext);
  return (
    !!mimeType && (isWebKitType(mimeType) || iosDocumentTypes.has(mimeType))
  );
};

/**
 * Whether File detail shows the downloaded file itself rather than its
 * info: PDFs everywhere, and what the iOS or Mac web view can render.
 */
export const canPreviewInline = (fileType?: string | null) =>
  fileType === 'pdf' ||
  (Platform.OS === 'ios' &&
    (DeviceInfo.isMac()
      ? canRenderInMacWebview(fileType)
      : canRenderInIosWebview(fileType)));

/**
 * Whether the file preview may show a load: the file itself, a blank page,
 * or the pages WebKit converts an Office or iWork document into
 * (`x-apple-ql-id:`). Anything else, like a web page a downloaded .html file
 * links or refreshes to, would look like part of learnX.
 */
export const isPreviewLoad = (url: string) =>
  /^(file|about|x-apple-ql-id):/i.test(url);
