import mimeTypes from 'mime-types';
import he from 'he';
import { coerce, gte } from 'semver';
import { dataSource } from 'data/source';
import DeviceInfo from 'constants/DeviceInfo';

const darkreader = require('./preval/darkreader.preval.js');

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
    </head>
    <body>
      <div id="root">
        ${content}
      </div>
    </body>
  </html>
`;
};

export const needWhiteBackground = (ext?: string | null) => {
  return ext && ['doc', 'docx', 'xls', 'xlsx'].includes(ext) ? true : false;
};

export const canRenderInMacWebview = (ext?: string | null) => {
  const osVersion = DeviceInfo.systemVersion();
  const coercedVersion = coerce(osVersion);
  if (!coercedVersion || !gte(coercedVersion, '17.1.0')) {
    return false;
  }

  if (!ext) {
    return false;
  }

  const mime = mimeTypes.lookup(ext);
  if (!mime) {
    return false;
  }

  return (
    mime === 'application/pdf' ||
    mime.includes('image/') ||
    mime.includes('audio/') ||
    mime.includes('video/') ||
    mime.includes('text/')
  );
};

const iosSupportedMimeTypes = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.apple.pages',
  'application/vnd.apple.keynote',
  'application/vnd.apple.numbers',
  'application/pdf',
];

export const canRenderInIosWebview = (ext?: string | null) => {
  if (!ext) {
    return false;
  }

  const mime = mimeTypes.lookup(ext);
  if (!mime) {
    return false;
  }

  return (
    iosSupportedMimeTypes.includes(mime) ||
    mime.includes('image/') ||
    mime.includes('audio/') ||
    mime.includes('video/') ||
    mime.includes('text/')
  );
};

export const removeTags = (html?: string) => {
  if (!html) {
    return '';
  }

  try {
    return he
      .decode(html.replace(/<!--(.*?)-->/g, '').replace(/<(?:.|\n)*?>/gm, ''))
      .replace(/\s\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};
