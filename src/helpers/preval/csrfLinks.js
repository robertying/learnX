// Runs in the notice / assignment web view (see helpers/html.ts), so plain
// browser JS. Inlined at build time by csrfLinks.preval.js.

/**
 * The URL with the CSRF token added when it points to a tsinghua.edu.cn page
 * over http(s); null for anything else, including in-page anchors. Relative
 * URLs resolve against `base`.
 */
function addCSRFTokenToUrl(url, token, base) {
  if (url.charAt(0) === '#') {
    return null;
  }
  var parsed;
  try {
    parsed = new URL(url, base);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !parsed.hostname.endsWith('tsinghua.edu.cn')
  ) {
    return null;
  }
  parsed.searchParams.set('_csrf', token);
  return parsed.toString();
}

/**
 * Adds the CSRF token to every link and source under `root` that points to the
 * course site. One bad URL doesn't stop the rest.
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
  module.exports = { addCSRFTokenToUrl, addCSRFTokenToLinks };
}
