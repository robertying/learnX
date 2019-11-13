import {darkreader} from './preval';

export const removeTags = (html: string) => {
  return html
    ? html
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/\s\s+/g, ' ')
        .trim()
    : '';
};

export const getWebViewTemplate = (content: string, isDarkMode?: boolean) =>
  `
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 20px;
        ${isDarkMode ? 'background-color: black;' : 'background-color: white;'}
      }
    </style>
  ${
    isDarkMode
      ? `
    <script>
      ${darkreader}
    </script>
    <script>
      DarkReader.enable();
    </script>
  `
      : ''
  }
  </head>
  <body>
    ${content}
  </body>
  `;

export const needWhiteBackground = (ext: string) => {
  return ['doc', 'docx', 'xls', 'xlsx'].includes(ext);
};
