// Runs in the notice / assignment web view on Android (see helpers/html.ts),
// so plain browser JS. Inlined at build time by linkTaps.preval.js.

/**
 * Reports each tapped link to the app instead of following it: Android's web
 * view doesn't say whether a load came from a tap, so the app would otherwise
 * also open what a `<meta http-equiv="refresh">` in the content loads. Each
 * message carries `key`, which only the template's own scripts know, so a
 * frame inside the content can't pose as a tap. A link to a spot on the page
 * (`#...`) still scrolls there.
 */
function reportLinkTaps(root, post, key) {
  root.addEventListener(
    'click',
    function (event) {
      var target = event.target;
      var link =
        target && target.closest && target.closest('a[href], area[href]');
      if (!link || link.getAttribute('href').charAt(0) === '#') {
        return;
      }
      event.preventDefault();
      post(JSON.stringify({ type: 'link', key: key, url: link.href }));
    },
    true,
  );
}

if (typeof module === 'object' && module.exports) {
  module.exports = { reportLinkTaps };
}
