import { mockLocale } from '../../../jest/locale';
import {
  checkedIds,
  emptySelection,
  filterSubtitle,
  listForFilter,
  selectedCountLabel,
  toggleAllSelection,
} from 'helpers/filterList';
import { t } from 'helpers/i18n';

const lists = {
  all: ['all'],
  unread: ['unread'],
  unfinished: ['unfinished'],
  finished: ['finished'],
  fav: ['fav'],
  archived: ['archived'],
  hidden: ['hidden'],
};

describe('listForFilter', () => {
  it('picks the list for each filter', () => {
    for (const key of Object.keys(lists) as (keyof typeof lists)[]) {
      expect(listForFilter(key, lists)).toBe(lists[key]);
    }
  });

  it('falls through to hidden when a list is missing', () => {
    const { all, fav, archived, hidden } = lists;
    const partial = { all, fav, archived, hidden };
    expect(listForFilter('unread', partial)).toBe(hidden);
    expect(listForFilter('unfinished', partial)).toBe(hidden);
    expect(listForFilter('finished', partial)).toBe(hidden);
  });
});

describe('filterSubtitle', () => {
  it('uses the screen subtitle for all, else names the filter', () => {
    expect(filterSubtitle('all', 'Spring 2026')).toBe('Spring 2026');
    expect(filterSubtitle('all')).toBeUndefined();
    expect(filterSubtitle('unread')).toBe(t('unread'));
    expect(filterSubtitle('fav')).toBe(t('fav'));
    expect(filterSubtitle('archived')).toBe(t('archived'));
    expect(filterSubtitle('hidden')).toBe(t('hidden'));
    expect(filterSubtitle('unfinished')).toBe(t('unfinished'));
    expect(filterSubtitle('finished')).toBe(t('finished'));
  });
});

describe('selection', () => {
  const items = [{ id: 'a' }, { id: 'b' }];

  it('starts with nothing checked', () => {
    expect(emptySelection(items)).toEqual({ a: false, b: false });
  });

  it('lists checked ids', () => {
    expect(checkedIds({ a: true, b: false, c: true })).toEqual(['a', 'c']);
  });

  it('checks all, or unchecks all when all are checked', () => {
    expect(toggleAllSelection({ a: true, b: false }, items)).toEqual({
      a: true,
      b: true,
    });
    expect(toggleAllSelection({ a: true, b: true }, items)).toEqual({
      a: false,
      b: false,
    });
  });

  it('labels the count by locale', () => {
    expect(selectedCountLabel(3)).toBe('3 selected');
    mockLocale.current = 'zh-CN';
    try {
      expect(selectedCountLabel(3)).toBe('已选中 3 个');
    } finally {
      mockLocale.current = 'en-US';
    }
  });
});
