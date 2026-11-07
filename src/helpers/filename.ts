/** Text after the last dot; the whole name when there is no dot */
export const getExtension = (filename: string) => {
  return filename ? filename.split('.').pop() : '';
};

/** The name without its last extension */
export const stripExtension = (filename: string) => {
  return filename ? filename.replace(/\.[^/.]+$/, '') : '';
};
