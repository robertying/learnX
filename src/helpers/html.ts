import mime from 'mime-types';
import * as cheerio from 'cheerio';
import {addCSRF} from 'data/source';

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
  return ext &&
    mime.lookup(ext) !== false &&
    mime.lookup(ext).toString().includes('image/') &&
    !mime.lookup(ext).toString().includes('vnd.')
    ? true
    : false;
};

export const canRenderInIosWebview = (ext?: string | null) => {
  if (!ext) {
    return false;
  }

  if (ext.toLowerCase() === 'zip' || ext.toLowerCase() === 'rar') {
    return false;
  }

  return true;
};

export const removeTags = (html?: string) => {
  return html
    ? html
        .replace(/<!--(.*?)-->/g, '')
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/\s\s+/g, ' ')
        .trim()
    : '';
};
