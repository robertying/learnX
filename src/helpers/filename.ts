/** Text after the last dot; the whole name when there is no dot */
export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

/** The name without its last extension */
export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};

/** Bytes a file system allows in one name; most allow 255. */
const MAX_NAME_BYTES = 255;

/** Cuts a string to at most `bytes` UTF-8 bytes without splitting a character. */
const truncateBytes = (text: string, bytes: number) => {
  let result = '';
  let used = 0;
  for (const char of text) {
    const size = new TextEncoder().encode(char).length;
    if (used + size > bytes) {
      break;
    }
    result += char;
    used += size;
  }
  return result;
};

/**
 * Makes text safe as one file or folder name: path separators, characters
 * Windows and the Mac Finder reject, and control characters become `_`, and
 * leading dots (hidden files, `..`) and trailing dots and spaces are dropped.
 * Long names are cut to fit, keeping `suffix` (an extension) whole.
 */
export const sanitizeFileName = (name: string, suffix = '') => {
  const clean = (text: string) =>
    // eslint-disable-next-line no-control-regex
    text.replace(/[/\\:*?"<>|\u0000-\u001f\u007f]/g, '_');
  const safeSuffix = clean(suffix);
  const base = truncateBytes(
    clean(name)
      .replace(/^[\s.]+/, '')
      .trim(),
    MAX_NAME_BYTES - new TextEncoder().encode(safeSuffix).length,
  ).replace(/[\s.]+$/, '');
  return `${base || '_'}${safeSuffix}`;
};

/**
 * The name a file is saved or shared under: its title with its extension, made
 * safe by `sanitizeFileName`. Every place that names a file on disk from server
 * data goes through this or `sanitizeFileName`, never a hand-built string.
 */
export const fileNameOf = ({
  title,
  fileType,
}: {
  title: string;
  fileType?: string | null;
}) => sanitizeFileName(title, fileType ? `.${fileType}` : '');

/** Bytes as the system shows them: 1000-based, one decimal from KB up. */
export const formatFileSize = (bytes: number) => {
  const units = ['KB', 'MB', 'GB', 'TB'];
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  let value = bytes;
  let unit = -1;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
};
