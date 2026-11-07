import { dataSource } from 'data/source';

export { removeTags } from './text';

const darkreader = require('./preval/darkreader.preval.js');

const katexStyles = require('./preval/katexStyles.preval.js');

const katex = require('./preval/katex.preval.js');

export const getWebViewTemplate = (
  content: string,
  darkMode?: boolean,
  backgroundColor?: string,
) => {
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
      <style>
        ${katexStyles}
      </style>
      <script>
        function addCSRFTokenToUrl(url, token) {
          const newUrl = new URL(url);
          if (newUrl.hostname?.endsWith('tsinghua.edu.cn')) {
            newUrl.searchParams.set('_csrf', token);
          }
          return newUrl.toString();
        }

        const csrfToken = "${dataSource.getCSRFToken()}";
        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('[href]').forEach((element) => {
            const url = element.getAttribute('href');
            if (!url) {
              return;
            }

            element.setAttribute('href', addCSRFTokenToUrl(url, csrfToken));
          });
          document.querySelectorAll('[src]').forEach((element) => {
            const url = element.getAttribute('src');
            if (!url) {
              return;
            }

            element.setAttribute('src', addCSRFTokenToUrl(url, csrfToken));
          });
        });
      </script>
      ${
        darkMode
          ? `
      <script>
        ${darkreader}
      </script>
      <script>
        DarkReader.enable({
          darkSchemeBackgroundColor: "${backgroundColor}"
        });
      </script>
      `
          : ''
      }
      <script>
        ${katex}
      </script>
    </head>
    <body>
      <div id="root">
        ${
          content.replace(/\\mbox/g, '\\text') // katex doesn't support \mbox
        }
      </div>
      <script>
        renderMathInElement(document.querySelector("#root"), {
          throwOnError: false
        });
      </script>
    </body>
  </html>
`;
};
