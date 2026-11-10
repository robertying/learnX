import { Platform } from 'react-native';
import { dataSource } from 'data/source';

const darkMode = require('./preval/darkMode.preval.js');

const csrfLinks = require('./preval/csrfLinks.preval.js');

const katexStyles = require('./preval/katexStyles.preval.js');

const katex = require('./preval/katex.preval.js');

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

let scriptNonce: string | undefined;

/**
 * Marks the template's own scripts, the only ones its policy lets run: the
 * content is written by teachers and runs as Web Learning, with the login
 * cookies. One per launch, so the same content gives the same page and the
 * web view doesn't reload. The web view's injected scripts aren't held to it.
 */
const getScriptNonce = () =>
  (scriptNonce ??= globalThis.crypto.randomUUID().replaceAll('-', ''));

/**
 * Wraps course-site HTML (notice and assignment descriptions) into a page for
 * AutoHeightWebView, without margins of its own: the page sits in a form row,
 * which has them. KaTeX (~300 KB) is only inlined when the content has
 * math, and dark mode is a small script instead of Dark Reader.
 */
export const getWebViewTemplate = (
  content: string,
  colors?: WebViewTemplateColors,
) => {
  const math = hasMath(content);
  const dark = colors?.dark ?? false;
  const nonce = getScriptNonce();
  return `
  <!DOCTYPE html>
  <html lang="zh-cmn-Hans">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests; script-src 'nonce-${nonce}'" />
      <style>
        body {
          margin: 0px;
          padding: 0px;${
            // The Body text style, which follows Dynamic Type like the rest
            // of the app. Android's WebView follows the font scale itself.
            Platform.OS === 'ios' ? '\n          font: -apple-system-body;' : ''
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
            ${JSON.stringify(dataSource.getCSRFToken())},
            document.baseURI
          );
        });
      </script>
      ${math ? `<script nonce="${nonce}">${katex}</script>` : ''}
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
