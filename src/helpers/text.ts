import { decode } from 'he';

/** Plain text from an HTML snippet, with whitespace collapsed */
export const removeTags = (html?: string) => {
  if (!html) {
    return '';
  }

  try {
    return decode(
      html.replace(/<!--(.*?)-->/g, '').replace(/<(?:.|\n)*?>/gm, ''),
    )
      .replace(/\s\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};
