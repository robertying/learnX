import { decode } from 'he';

/** Elements whose content is never shown as text. */
const HIDDEN_ELEMENTS =
  /<(style|script|head|title|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Tags that start a new line on the page, so their text doesn't run together. */
const LINE_BREAKS =
  /<(?:br|hr|\/?(?:p|div|li|ul|ol|dl|dt|dd|tr|td|th|table|h[1-6]|blockquote|pre|section|article|header|footer))\b[^>]*>/gi;

/**
 * Plain text from an HTML snippet: comments, styles and scripts dropped, a
 * space where a paragraph, line or cell ends, other tags dropped, entities
 * decoded, and runs of two or more whitespace characters made one space.
 */
export const removeTags = (html?: string) => {
  if (!html) {
    return '';
  }

  try {
    return decode(
      html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(HIDDEN_ELEMENTS, '')
        .replace(LINE_BREAKS, ' ')
        .replace(/<[^>]*>/g, ''),
    )
      .replace(/\s\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};

/** `text` cut to `length` characters, ending in an ellipsis when it was longer. */
export const truncate = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;

/** djb2, as hex: a short, stable stand-in for a text, e.g. in a key or uid. */
export const hash = (text: string) => {
  let result = 5381;
  for (let i = 0; i < text.length; i++) {
    result = (result * 33 + text.charCodeAt(i)) % 0x100000000;
  }
  return result.toString(16);
};
