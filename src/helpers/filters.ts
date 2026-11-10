// The filters of a list screen (components/FilterList): the choices its
// filter menu offers, which list each shows, the header subtitle for it, and
// the ids picked in selection mode.
import type { ComponentProps } from 'react';
import type MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import type { SFSymbol } from 'sf-symbols-typescript';
import { t } from './i18n';

export type FilterSelection =
  | 'all'
  | 'unread'
  | 'fav'
  | 'archived'
  | 'hidden'
  | 'unfinished'
  | 'finished';

export interface FilterCounts {
  allCount: number;
  unreadCount?: number;
  favCount?: number;
  archivedCount?: number;
  hiddenCount: number;
  unfinishedCount?: number;
}

export interface FilterOption {
  name: FilterSelection;
  label: string;
  count: number;
  sfSymbol: SFSymbol;
  /** The matching Material Design icon, for the Android dropdown */
  materialIcon: ComponentProps<typeof MaterialDesignIcons>['name'];
}

export const filterOptions = ({
  allCount,
  unreadCount,
  favCount,
  archivedCount,
  hiddenCount,
  unfinishedCount,
}: FilterCounts): FilterOption[] => {
  const options: (FilterOption | false)[] = [
    unfinishedCount !== undefined && {
      name: 'unfinished',
      label: t('unfinished'),
      count: unfinishedCount,
      sfSymbol: 'circle',
      materialIcon: 'checkbox-blank-circle-outline',
    },
    unfinishedCount !== undefined && {
      name: 'finished',
      label: t('finished'),
      count: allCount - unfinishedCount,
      sfSymbol: 'checkmark.circle',
      materialIcon: 'checkbox-marked-circle-outline',
    },
    {
      name: 'all',
      label: t('all'),
      count: allCount,
      sfSymbol: 'tray',
      materialIcon: 'inbox',
    },
    unreadCount !== undefined && {
      name: 'unread',
      label: t('unread'),
      count: unreadCount,
      sfSymbol: 'envelope.badge',
      materialIcon: 'email-mark-as-unread',
    },
    favCount !== undefined && {
      name: 'fav',
      label: t('fav'),
      count: favCount,
      sfSymbol: 'heart',
      materialIcon: 'heart-outline',
    },
    archivedCount !== undefined && {
      name: 'archived',
      label: t('archived'),
      count: archivedCount,
      sfSymbol: 'archivebox',
      materialIcon: 'archive-outline',
    },
    {
      name: 'hidden',
      label: t('hidden'),
      count: hiddenCount,
      sfSymbol: 'eye.slash',
      materialIcon: 'eye-off-outline',
    },
  ];
  return options.filter((o): o is FilterOption => o !== false);
};

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
 * The list a filter selection shows. A filter the screen has no list for (a
 * saved Unread on a screen without one) shows everything.
 */
export const listForFilter = <T>(
  selected: FilterSelection,
  lists: FilterLists<T>,
): T[] => {
  switch (selected) {
    case 'all':
      return lists.all;
    case 'hidden':
      return lists.hidden;
    case 'unread':
    case 'unfinished':
    case 'finished':
    case 'fav':
    case 'archived':
      return lists[selected] ?? lists.all;
    default:
      return selected satisfies never;
  }
};

/** Header subtitle naming the filter; the screen's own subtitle for "all" */
export const filterSubtitle = (
  selected: FilterSelection,
  defaultSubtitle?: string,
) => (selected === 'all' ? defaultSubtitle : t(selected));

/**
 * The ids checked in selection mode among `items`, in list order. Ids of items
 * no longer in the list (archived or refreshed away) don't count.
 */
export const checkedIds = (
  selection: Record<string, boolean>,
  items: { id: string }[],
) => items.filter(item => selection[item.id]).map(item => item.id);

/**
 * Checks every item, or unchecks every item when all are already checked.
 * Decided from `items`, so an item added since selection mode turned on
 * counts as unchecked.
 */
export const toggleAllSelection = (
  prev: Record<string, boolean>,
  items: { id: string }[],
) => {
  const allChecked = items.length > 0 && items.every(item => prev[item.id]);
  return allChecked
    ? {}
    : Object.fromEntries(items.map(item => [item.id, true]));
};

export const selectedCountLabel = (count: number) =>
  t('selectedCount', { count });
