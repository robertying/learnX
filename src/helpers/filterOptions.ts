// The filter choices a list offers, for the native filter menu.
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
    },
    unfinishedCount !== undefined && {
      name: 'finished',
      label: t('finished'),
      count: allCount - unfinishedCount,
      sfSymbol: 'checkmark.circle',
    },
    {
      name: 'all',
      label: t('all'),
      count: allCount,
      sfSymbol: 'tray',
    },
    unreadCount !== undefined && {
      name: 'unread',
      label: t('unread'),
      count: unreadCount,
      sfSymbol: 'envelope.badge',
    },
    favCount !== undefined && {
      name: 'fav',
      label: t('fav'),
      count: favCount,
      sfSymbol: 'heart',
    },
    archivedCount !== undefined && {
      name: 'archived',
      label: t('archived'),
      count: archivedCount,
      sfSymbol: 'archivebox',
    },
    {
      name: 'hidden',
      label: t('hidden'),
      count: hiddenCount,
      sfSymbol: 'eye.slash',
    },
  ];
  return options.filter((o): o is FilterOption => o !== false);
};
