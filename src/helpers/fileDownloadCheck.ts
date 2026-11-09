const COURSE_FILE_DOWNLOAD_PATH =
  /^\/b\/wlxt\/kj\/wlkc_kjxxb\/(student|teacher)\/downloadFile$/;

/**
 * The check Web Learning calls before it downloads a course file
 * (`downloadFileBefore`), for a course file's download URL; null for any other
 * URL. A whole download marks the file seen on the server (thu-learn-lib's
 * `file-seen` live check, 2026-11-09); the website always calls this first,
 * so learnX does too.
 */
export const fileDownloadCheckUrl = (downloadUrl: string): string | null => {
  let url: URL;
  try {
    url = new URL(downloadUrl);
  } catch {
    return null;
  }
  const fileId = url.searchParams.get('wjid');
  if (!COURSE_FILE_DOWNLOAD_PATH.test(url.pathname) || !fileId) {
    return null;
  }
  return `${url.origin}${url.pathname}Before?wjid=${encodeURIComponent(fileId)}`;
};
