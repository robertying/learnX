import { dataSource } from 'data/source';

export { removeTags } from './text';

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
}

/**
 * Wraps course-site HTML (notice and assignment descriptions) into a page for
 * AutoHeightWebView. KaTeX (~300 KB) is only inlined when the content has
 * math, and dark mode is a small script instead of Dark Reader.
 */
export const getWebViewTemplate = (
  content: string,
  colors?: WebViewTemplateColors,
) => {
  const math = hasMath(content);
  const dark = colors?.dark ?? false;
  return `
  <!DOCTYPE html>
  <html lang="zh-cmn-Hans">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      <style>
        body {
          margin: 0px;
          padding: 1rem;
        }
        #root {
          height: 100%;
          width: 100%;
          overflow: auto;
        }
        #root > p:first-child {
          margin-top: 0px;
        }
        #root > p:last-child {
          margin-bottom: 0px;
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
      <script>
        ${csrfLinks}
        document.addEventListener('DOMContentLoaded', function () {
          addCSRFTokenToLinks(
            document,
            ${JSON.stringify(dataSource.getCSRFToken())},
            document.baseURI
          );
        });
      </script>
      ${math ? `<script>${katex}</script>` : ''}
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
      <script>
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
      <script>
        ${darkMode}
        applyDarkMode(document.querySelector("#root"), "${colors?.backgroundColor}");
      </script>
      `
          : ''
      }
    </body>
  </html>
`;
};
