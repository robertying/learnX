import Urls from 'constants/Urls';

// The rule lives in preval/csrfLinks.js, which also runs inside the notice and
// assignment web views, so the app and those pages decide the same way which
// URLs get the login cookies and the CSRF token.
const csrfLinks: {
  isLearnUrl: (url: string, base?: string) => boolean;
} = require('./preval/csrfLinks.js');

/**
 * Whether the URL points to Web Learning (learn.tsinghua.edu.cn itself).
 * Relative URLs resolve against `base`, and point nowhere without one.
 */
export const isLearnUrl = (url: string, base?: string) =>
  csrfLinks.isLearnUrl(url, base);

/** The `src` attributes in HTML, quoted or not. */
const SOURCE_ATTRIBUTE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;

/**
 * Whether course-site HTML loads anything from Web Learning (an image the
 * editor uploaded, say), which needs the session's cookies and token. The
 * page loads at Web Learning's root, so a relative source is Web Learning's.
 */
export const loadsFromWebLearning = (html: string) =>
  Array.from(html.matchAll(SOURCE_ATTRIBUTE)).some(match =>
    isLearnUrl(match[1] ?? match[2] ?? match[3], `${Urls.learn}/`),
  );
