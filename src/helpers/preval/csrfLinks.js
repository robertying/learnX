// Runs in the notice / assignment web view (see helpers/html.ts), so plain
// browser JS. Inlined at build time by csrfLinks.preval.js.

/** The one host the login cookies and the CSRF token belong to. */
var LEARN_HOST = 'learn.tsinghua.edu.cn';

/**
 * The URL, as https, when it points to Web Learning (learn.tsinghua.edu.cn
 * itself, not a lookalike or another tsinghua.edu.cn site); null for anything
 * else. Relative URLs resolve against `base`. The app uses this too (see
 * helpers/learnUrl.ts), so the login cookies and the token follow one rule.
 */
function parseLearnUrl(url, base) {
  var parsed;
  try {
    parsed = new URL(url, base);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.hostname !== LEARN_HOST
  ) {
    return null;
  }
  // The token never goes out in the clear; the site serves https anyway.
  parsed.protocol = 'https:';
  return parsed;
}

/** Whether the URL points to Web Learning; see `parseLearnUrl`. */
function isLearnUrl(url, base) {
  return parseLearnUrl(url, base) !== null;
}

/**
 * The URL with the CSRF token added when it points to Web Learning (see
 * `parseLearnUrl`); null for anything else, including in-page anchors.
 */
function addCSRFTokenToUrl(url, token, base) {
  if (url.charAt(0) === '#') {
    return null;
  }
  var parsed = parseLearnUrl(url, base);
  if (!parsed) {
    return null;
  }
  parsed.searchParams.set('_csrf', token);
  return parsed.toString();
}

/**
 * Adds the CSRF token to every link and source under `root` that points to
 * Web Learning. One bad URL doesn't stop the rest.
 */
function addCSRFTokenToLinks(root, token, base) {
  ['href', 'src'].forEach(function (attribute) {
    root.querySelectorAll('[' + attribute + ']').forEach(function (element) {
      var url = element.getAttribute(attribute);
      var withToken = url && addCSRFTokenToUrl(url, token, base);
      if (withToken) {
        element.setAttribute(attribute, withToken);
      }
    });
  });
}

if (typeof module === 'object' && module.exports) {
  module.exports = { isLearnUrl, addCSRFTokenToUrl, addCSRFTokenToLinks };
}
