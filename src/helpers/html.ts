import { dataSource } from 'data/source';
import { getScriptNonce } from 'helpers/webContent';
import { isAndroid, isApple, isElectron } from 'helpers/platform';

const darkMode = require('./preval/darkMode.preval.js');

const csrfLinks = require('./preval/csrfLinks.preval.js');

const katexStyles = require('./preval/katexStyles.preval.js');

const katex = require('./preval/katex.preval.js');

const linkTaps = require('./preval/linkTaps.preval.js');

/**
 * Whether the content has math for KaTeX's auto-render, using its default
 * delimiters ($$...$$, \(...\), \[...\] and \begin{...} environments).
 */
export const hasMath = (content: string) =>
  /\$\$|\\\(|\\\[|\\begin\{/.test(content);

export interface WebViewTemplateColors {
  dark: boolean;
  backgroundColor: string;
  textColor: string;
  /** Links, in the app's tint instead of the browser's blue. */
  linkColor?: string;
}

/**
 * The language screen readers read the content in: Chinese when it has any
 * Chinese characters, English otherwise (an English course's notices).
 */
const contentLanguage = (content: string) =>
  /\p{Script=Han}/u.test(content) ? 'zh-Hans' : 'en';

/**
 * Wraps course-site HTML (notice and assignment descriptions) into a page for
 * AutoHeightWebView, without margins of its own: the page sits in a form row,
 * which has them. KaTeX (~300 KB) is only inlined when the content has
 * math, and dark mode is a small script (`preval/darkMode.js`). Links and
 * sources on Web Learning get `csrfToken`, the session's by default.
 */
export const getWebViewTemplate = (
  content: string,
  colors?: WebViewTemplateColors,
  csrfToken = dataSource.getCSRFToken(),
) => {
  const math = hasMath(content);
  const dark = colors?.dark ?? false;
  const nonce = getScriptNonce();
  return `
  <!DOCTYPE html>
  <html lang="${contentLanguage(content)}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests; script-src 'nonce-${nonce}'; form-action 'none'" />
      <style>
        body {
          margin: 0px;
          padding: 0px;${
            // The Body text style, which follows Dynamic Type like the rest
            // of the app. Android's WebView follows the font scale itself
            // and draws sans-serif already; Chromium's own default is serif.
            isApple()
              ? '\n          font: -apple-system-body;'
              : isElectron()
                ? '\n          font-family: system-ui, sans-serif;'
                : ''
          }
        }
        #root {
          height: 100%;
          width: 100%;
          overflow: auto;
          /* A long URL wraps instead of running off the edge. */
          overflow-wrap: anywhere;
        }
        #root > p:first-child {
          margin-top: 0px;
        }
        #root > p:last-child {
          margin-bottom: 0px;
        }
        /* An image keeps its own shape and fits the width. Web Learning's
           editor writes the size it was given inline, which can be wider
           than the screen or not match the picture. */
        img {
          max-width: 100% !important;
          height: auto !important;
        }${
          colors?.linkColor
            ? `
        a {
          color: ${colors.linkColor};
        }`
            : ''
        }
      </style>
      ${
        dark
          ? `
      <style>
        :root {
          color-scheme: dark;
        }
        html, body {
          background-color: ${colors?.backgroundColor};
          color: ${colors?.textColor};
        }
      </style>
      `
          : ''
      }
      ${math ? `<style>${katexStyles}</style>` : ''}
      <script nonce="${nonce}">
        ${csrfLinks}
        document.addEventListener('DOMContentLoaded', function () {
          addCSRFTokenToLinks(
            document,
            ${JSON.stringify(csrfToken)},
            document.baseURI
          );
        });
      </script>
      ${math ? `<script nonce="${nonce}">${katex}</script>` : ''}${
        isAndroid() || isElectron()
          ? `
      <script nonce="${nonce}">
        ${linkTaps}
        reportLinkTaps(
          document,
          function (message) {
            window.ReactNativeWebView.postMessage(message);
          },
          ${JSON.stringify(nonce)}
        );
      </script>`
          : ''
      }
    </head>
    <body>
      <div id="root">
        ${
          content.replace(/\\mbox/g, '\\text') // katex doesn't support \mbox
        }
      </div>
      ${
        math
          ? `
      <script nonce="${nonce}">
        renderMathInElement(document.querySelector("#root"), {
          throwOnError: false
        });
      </script>
      `
          : ''
      }
      ${
        dark
          ? `
      <script nonce="${nonce}">
        ${darkMode}
        applyDarkMode(document.querySelector("#root"), ${JSON.stringify(colors?.backgroundColor ?? '')});
      </script>
      `
          : ''
      }
    </body>
  </html>
`;
};
