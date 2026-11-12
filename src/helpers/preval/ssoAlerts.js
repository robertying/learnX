(function () {
  'use strict';

  // Runs before the SSO page's own scripts (injectedJavaScriptBeforeContentLoaded
  // in screens/SSO.tsx), so the page calls this alert instead of the browser's.
  if (
    window.location.protocol !== 'https:' ||
    !/(^|\.)tsinghua\.edu\.cn$/.test(window.location.hostname)
  ) {
    return true;
  }

  // The alert the page shows when the account already has as many trusted
  // browsers as it may: "The number of trusted browser has reached the
  // limit." or "信任浏览器数量已达到上限". learnX shows its own alert for it,
  // which says how to free a slot and links to the page that does.
  const isTrustedBrowserLimit = message => {
    const text = String(message);
    return (
      (/trusted browser/i.test(text) && /limit/i.test(text)) ||
      (/信任浏览器/.test(text) && /上限/.test(text))
    );
  };

  const originalAlert = window.alert;
  window.alert = function (message) {
    const webView = window.ReactNativeWebView;
    if (webView?.postMessage && isTrustedBrowserLimit(message)) {
      webView.postMessage(JSON.stringify({ type: 'TRUSTED_BROWSER_LIMIT' }));
      return;
    }
    // Every other alert shows as the page meant it to.
    return originalAlert.apply(this, arguments);
  };

  return true;
})();
