(function () {
  'use strict';

  const sendToReactNative = (type, data) => {
    window?.ReactNativeWebView?.postMessage?.(JSON.stringify({ type, data }));
  };

  // Intercept XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    this._method = method;
    return origOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (
      this._url === '/b/doubleAuth/personal/saveFinger' &&
      typeof body === 'string'
    ) {
      const params = new URLSearchParams(body);
      params.set('fingerprint', '${fingerPrint}');
      params.set('deviceName', '${deviceName}');
      params.set('radioVal', '是');
      body = params.toString();
    }

    this._body = body;
    this.addEventListener('load', () => {
      // sendToReactNative('XHR_RESPONSE', {
      //   method: this._method,
      //   url: this._url,
      //   status: this.status,
      //   requestBody: this._body,
      //   response: this.responseText,
      // });
    });

    // sendToReactNative('XHR_REQUEST', {
    //   method: this._method,
    //   url: this._url,
    //   body: body,
    // });
    return origSend.apply(this, [body]);
  };

  const setupLoginPage = () => {
    const usernameInput = document.querySelector('input#i_user');
    const passwordInput = document.querySelector('input#i_pass');

    // Exit if ANY of the key elements for the login page are not yet rendered.
    // This ensures we act only when the form is fully loaded.
    if (!usernameInput || !passwordInput) {
      return false;
    }

    // Populate username and password fields.
    usernameInput.value = '${username}';
    usernameInput.readOnly = true;

    passwordInput.value = '${password}';
    passwordInput.readOnly = true;

    return true; // Return true only when all tasks for this page are complete.
  };

  /**
   * Overrides the jQuery submit function to intercept form data.
   * This allows capturing form submissions for external processing in React Native.
   */
  const overrideJQuerySubmit = () => {
    // Ensure jQuery is loaded and has not already been overridden.
    if (window.jQuery && !window.jQuery.fn.submit.isOverridden) {
      // Store a reference to the original submit function.
      const originalSubmit = window.jQuery.fn.submit;

      // Redefine the submit function.
      window.jQuery.fn.submit = function () {
        const formElement = this[0]; // 'this' is the jQuery object; this[0] is the DOM element.

        const fingerPrintField = formElement.querySelector(
          '[name="fingerPrint"]',
        );
        if (fingerPrintField) {
          fingerPrintField.value = '${fingerPrint}';
        }

        const singleLoginField = formElement.querySelector(
          '[name="singleLogin"]',
        );
        if (singleLoginField && !singleLoginField.checked) {
          singleLoginField.click();
        }

        const formData = new FormData(formElement);
        const requestBody = Object.fromEntries(formData.entries());

        // Post the captured data to the React Native WebView.
        sendToReactNative('JQUERY_SUBMIT', {
          formId: formElement.id,
          requestBody: requestBody,
        });

        // Call the original submit function to allow the form submission to proceed.
        return originalSubmit.apply(this, arguments);
      };

      // Add a flag to prevent re-applying the override.
      window.jQuery.fn.submit.isOverridden = true;
    }
  };

  // Set up an interval to check for jQuery and apply the submit override once available.
  const jqueryChecker = setInterval(() => {
    if (window.jQuery) {
      clearInterval(jqueryChecker);
      overrideJQuerySubmit();
    }
  }, 100);

  const runAllTasks = () => {
    setupLoginPage();
  };

  // Run the custom script on page change.
  // eslint-disable-next-line no-undef
  const observer = new MutationObserver(() => {
    observer.disconnect();
    runAllTasks();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  runAllTasks();

  return true;
})();
