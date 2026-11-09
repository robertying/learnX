// What a tapped notification, widget row, learnx:// link or Spotlight result
// opens, and the learnx:// links that carry it.

/** An item to open, or without an id, its type's list. */
export interface ItemTarget {
  type: 'notice' | 'assignment' | 'file';
  /** The item to open; without it, the type's list. */
  id?: string;
}

/** What a learnx:// link opens: an item or list, or the Today tab. */
export type OpenTarget = ItemTarget | { type: 'today'; id?: undefined };

const itemTypes = new Set<string>(['notice', 'assignment', 'file']);

export const isItemType = (type: string): type is ItemTarget['type'] =>
  itemTypes.has(type);

/**
 * The learnx:// link that opens a target, e.g. `learnx://assignment/<id>` for
 * a widget row. Without an id, it opens the type's list.
 */
export const getTargetUrl = ({ type, id }: OpenTarget) =>
  `learnx://${type}${id ? `/${encodeURIComponent(id)}` : ''}`;

/** The target of a learnx:// link, if it points to one. */
export const getUrlTarget = (url: string): OpenTarget | null => {
  const match = /^learnx:\/\/([a-z]+)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/i.exec(
    url,
  );
  if (match?.[1] === 'today') {
    return { type: 'today' };
  }
  if (!match || !isItemType(match[1])) {
    return null;
  }
  try {
    return {
      type: match[1] as ItemTarget['type'],
      id: match[2] ? decodeURIComponent(match[2]) : undefined,
    };
  } catch {
    return null;
  }
};
