// The filter choices a list offers, for the native filter menu.
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
