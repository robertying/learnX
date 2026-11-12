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

/**
 * Starts a sentence with a phrase meant for the middle of one, such as "due
 * today at …"; Chinese has no case, so it's unchanged.
 */
export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
