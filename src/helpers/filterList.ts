// Pure parts of components/FilterList: which list a filter shows, the header
// subtitle for it, and the ids picked in selection mode.
import type { FilterSelection } from 'components/Filter';
import { isLocaleChinese, t } from './i18n';

export interface FilterLists<T> {
  all: T[];
  unread?: T[];
  unfinished?: T[];
  finished?: T[];
  fav?: T[];
  archived?: T[];
  hidden: T[];
}

/**
 * The list a filter selection shows. Unfinished, finished and unread fall
 * through to the hidden list when the screen doesn't provide them, as
 * before; fav and archived are always provided where they can be picked.
 */
export const listForFilter = <T>(
  selected: FilterSelection,
  lists: FilterLists<T>,
): T[] =>
  (selected === 'unfinished' && lists.unfinished
    ? lists.unfinished
    : selected === 'finished' && lists.finished
      ? lists.finished
      : selected === 'all'
        ? lists.all
        : selected === 'unread' && lists.unread
          ? lists.unread
          : selected === 'fav'
            ? lists.fav
            : selected === 'archived'
              ? lists.archived
              : lists.hidden)!;

/** Header subtitle naming the filter; the screen's own subtitle for "all" */
export const filterSubtitle = (
  selected: FilterSelection,
  defaultSubtitle?: string,
) => {
  switch (selected) {
    case 'all':
      return defaultSubtitle;
    case 'unread':
      return t('unread');
    case 'fav':
      return t('fav');
    case 'archived':
      return t('archived');
    case 'hidden':
      return t('hidden');
    case 'unfinished':
      return t('unfinished');
    default:
      return t('finished');
  }
};

/** Ids checked in selection mode, in insertion order */
export const checkedIds = (selection: Record<string, boolean>) =>
  Object.keys(selection).filter(id => selection[id] === true);

/** A selection with every item unchecked */
export const emptySelection = (items: { id: string }[]) =>
  Object.fromEntries(items.map(item => [item.id, false]));

/** Checks every item, or unchecks every item when all are already checked */
export const toggleAllSelection = (
  prev: Record<string, boolean>,
  items: { id: string }[],
) => {
  const allChecked = Object.values(prev).every(Boolean);
  return Object.fromEntries(items.map(item => [item.id, !allChecked]));
};

export const selectedCountLabel = (count: number) =>
  isLocaleChinese() ? `已选中 ${count} 个` : `${count} selected`;
