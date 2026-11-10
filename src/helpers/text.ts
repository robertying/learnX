import { decode } from 'he';

/**
 * Plain text from an HTML snippet: comments and tags dropped, entities
 * decoded, and runs of two or more whitespace characters made one space.
 */
export const removeTags = (html?: string) => {
  if (!html) {
    return '';
  }

  try {
    return decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ''))
      .replace(/\s\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
};
