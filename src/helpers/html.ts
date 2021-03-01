import mime from 'mime-types';

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
      <style>
        body {
          margin: 16px 0px 0px 0px;
          padding: 0px 16px;
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
      ${content}
    </body>
  </html>
`;

export const needWhiteBackground = (ext?: string | null) => {
  return ext && ['doc', 'docx', 'xls', 'xlsx'].includes(ext) ? true : false;
};

export const canRenderInMacWebview = (ext?: string | null) => {
  return ext &&
    (ext === 'pdf' ||
      (mime.lookup(ext) !== false &&
        mime.lookup(ext).toString().includes('image/') &&
        !mime.lookup(ext).toString().includes('vnd.')))
    ? true
    : false;
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
