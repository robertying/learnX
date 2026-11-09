import { mockLocale } from '../../../jest/locale';
import {
  checkedIds,
  filterSubtitle,
  listForFilter,
  selectedCountLabel,
  toggleAllSelection,
} from 'helpers/filters';
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

  it('shows everything when the screen has no list for the filter', () => {
    const { all, hidden } = lists;
    const partial = { all, hidden };
    expect(listForFilter('unread', partial)).toBe(all);
    expect(listForFilter('unfinished', partial)).toBe(all);
    expect(listForFilter('fav', partial)).toBe(all);
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

  it('lists checked ids of the items still shown, in list order', () => {
    expect(checkedIds({ b: true, a: true, gone: true }, items)).toEqual([
      'a',
      'b',
    ]);
    expect(checkedIds({ a: false }, items)).toEqual([]);
  });

  it('checks all, or unchecks all when all are checked', () => {
    expect(toggleAllSelection({ a: true }, items)).toEqual({
      a: true,
      b: true,
    });
    expect(toggleAllSelection({ a: true, b: true }, items)).toEqual({});
  });

  it('checks all when an item came in after the others were checked', () => {
    expect(
      toggleAllSelection({ a: true, b: true }, [...items, { id: 'c' }]),
    ).toEqual({ a: true, b: true, c: true });
  });

  it('labels the count by locale', () => {
    expect(selectedCountLabel(3)).toBe('3 selected');
    mockLocale.current = 'zh-CN';
    try {
      expect(selectedCountLabel(3)).toBe('已选择 3 项');
    } finally {
      mockLocale.current = 'en-US';
    }
  });
});
