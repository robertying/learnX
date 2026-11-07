// Which downloaded files File detail can show inline, and how.
import { Platform } from 'react-native';
import mime from 'mime';
import { coerce, gte } from 'semver';
import DeviceInfo from 'constants/DeviceInfo';

export const needWhiteBackground = (ext?: string | null) => {
  return ext && ['doc', 'docx', 'xls', 'xlsx'].includes(ext) ? true : false;
};

export const canRenderInMacWebview = (ext?: string | null) => {
  const osVersion = DeviceInfo.systemVersion();
  const coercedVersion = coerce(osVersion);
  if (!coercedVersion || !gte(coercedVersion, '17.1.0')) {
    return false;
  }

  if (!ext) {
    return false;
  }

  const mimeType = mime.getType(ext);
  if (!mimeType) {
    return false;
  }

  return (
    mimeType === 'application/pdf' ||
    mimeType.includes('image/') ||
    mimeType.includes('audio/') ||
    mimeType.includes('video/') ||
    mimeType.includes('text/')
  );
};

const iosSupportedMimeTypes = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.apple.pages',
  'application/vnd.apple.keynote',
  'application/vnd.apple.numbers',
  'application/pdf',
];

export const canRenderInIosWebview = (ext?: string | null) => {
  if (!ext) {
    return false;
  }

  const mimeType = mime.getType(ext);
  if (!mimeType) {
    return false;
  }

  return (
    iosSupportedMimeTypes.includes(mimeType) ||
    mimeType.includes('image/') ||
    mimeType.includes('audio/') ||
    mimeType.includes('video/') ||
    mimeType.includes('text/')
  );
};

/**
 * Whether File detail shows the downloaded file itself rather than its
 * info: PDFs everywhere, and what the iOS or Mac web view can render.
 */
export const canPreviewInline = (fileType?: string | null) =>
  fileType === 'pdf' ||
  (Platform.OS === 'ios' &&
    !DeviceInfo.isMac() &&
    canRenderInIosWebview(fileType)) ||
  (Platform.OS === 'ios' &&
    DeviceInfo.isMac() &&
    canRenderInMacWebview(fileType));
