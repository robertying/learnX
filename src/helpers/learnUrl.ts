// The rule lives in preval/csrfLinks.js, which also runs inside the notice and
// assignment web views, so the app and those pages decide the same way which
// URLs get the login cookies and the CSRF token.
const csrfLinks: {
  isLearnUrl: (url: string, base?: string) => boolean;
  addCSRFTokenToUrl: (
    url: string,
    token: string,
    base?: string,
  ) => string | null;
} = require('./preval/csrfLinks.js');

/** Whether the URL points to Web Learning (learn.tsinghua.edu.cn itself). */
export const isLearnUrl = (url: string) => csrfLinks.isLearnUrl(url);

/**
 * The URL with the CSRF token added, as https, when it points to Web
 * Learning; any other URL comes back unchanged.
 */
export const addCSRFTokenToLearnUrl = (url: string, token: string) =>
  csrfLinks.addCSRFTokenToUrl(url, token) ?? url;
