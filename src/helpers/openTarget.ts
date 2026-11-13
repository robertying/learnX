// What a tapped notification, widget row, learnx:// link or Spotlight result
// opens, and the learnx:// links that carry it.

/** An item to open, or without an id, its type's list. */
export interface ItemTarget {
  type: 'notice' | 'assignment' | 'file';
  /** The item to open; without it, the type's list. */
  id?: string;
}

/** A course's page, or without an id, the course list: class events link here. */
export interface CourseTarget {
  type: 'course';
  id?: string;
}

/** Something opened from its tab's list: an item or a course. */
export type ListTarget = ItemTarget | CourseTarget;

/** What a learnx:// link opens: an item, a course or a list, or Today. */
export type OpenTarget = ListTarget | { type: 'today'; id?: undefined };

/** Where each kind of item opens: its tab, the tab's list, and the item's page. */
export const targetRoutes = {
  notice: { tab: 'NoticeStack', list: 'Notices', detail: 'NoticeDetail' },
  assignment: {
    tab: 'AssignmentStack',
    list: 'Assignments',
    detail: 'AssignmentDetail',
  },
  file: { tab: 'FileStack', list: 'Files', detail: 'FileDetail' },
  course: { tab: 'CourseStack', list: 'Courses', detail: 'CourseDetail' },
} as const satisfies Record<
  ListTarget['type'],
  { tab: string; list: string; detail: string }
>;

const itemTypes = new Set<string>(['notice', 'assignment', 'file']);
const listTypes = new Set<string>(Object.keys(targetRoutes));

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
  if (!match || !listTypes.has(match[1])) {
    return null;
  }
  try {
    return {
      type: match[1] as ListTarget['type'],
      id: match[2] ? decodeURIComponent(match[2]) : undefined,
    };
  } catch {
    return null;
  }
};
