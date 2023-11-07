import mimeTypes from 'mime-types';
import * as cheerio from 'cheerio';
import {coerce, gte} from 'semver';
import {addCSRF} from 'data/source';
import DeviceInfo from 'constants/DeviceInfo';

declare const preval: any;

export const darkreader = preval`
    const fs = require('fs');
    const path = require('path');
    let str;
    if (process.cwd().includes("ios")) {
      str = fs.readFileSync(path.resolve(process.cwd(), '../node_modules/darkreader/darkreader.js'), 'utf8');
    } else {
      str = fs.readFileSync(path.resolve(process.cwd(), './node_modules/darkreader/darkreader.js'), 'utf8');
    }
    module.exports = str
`;

export const getWebViewTemplate = (
  content: string,
  darkMode?: boolean,
  backgroundColor?: string,
) => `
  <!DOCTYPE html>
  <html lang="zh-cmn-Hans">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      <style>
        body {
          margin: 0px;
          padding: 16px;
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
        ${addCSRFToAllUrlsInHtml(content)}
      </div>
    </body>
  </html>
`;

export const addCSRFToAllUrlsInHtml = (html: string) => {
  const $ = cheerio.load(html, undefined, false);
  $('[href]').each((i, element) => {
    const url = $(element).attr('href');
    if (url) {
      $(element).attr('href', addCSRF(url));
    }
  });
  $('[src]').each((i, element) => {
    const url = $(element).attr('src');
    if (url) {
      $(element).attr('src', addCSRF(url));
    }
  });
  return $.html();
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
  const $ = cheerio.load(html, undefined, false);
  return $.text().replace(/\s\s+/g, ' ').trim();
};
