import {
  SWIPE_TAIL_MS,
  cardActions,
  pressWhileSwiped,
} from 'helpers/cardActions';
import { t } from 'helpers/i18n';

const keys = (actions: ReturnType<typeof cardActions>) =>
  actions.map(a => a.key);

describe('cardActions', () => {
  it('offers only hide or show for courses', () => {
    const [hide] = cardActions({ canHide: true });
    expect(cardActions({ canHide: true, fav: true })).toHaveLength(1);
    expect(hide).toMatchObject({
      key: 'hide',
      testID: 'card-hide',
      label: t('hide'),
      icon: 'hide',
    });
    expect(cardActions({ canHide: true, hidden: true })[0]).toMatchObject({
      label: t('unhide'),
      icon: 'show',
    });
  });

  it('offers favorite then archive for other cards', () => {
    const actions = cardActions({ canHide: false });
    expect(keys(actions)).toEqual(['fav', 'archive']);
    expect(actions[0]).toMatchObject({
      testID: 'card-fav',
      label: t('favorite'),
      icon: 'favorite',
    });
    expect(actions[1]).toMatchObject({
      testID: 'card-archive',
      label: t('archive'),
      icon: 'archive',
    });
  });

  it('offers unfavorite for favorites', () => {
    expect(cardActions({ canHide: false, fav: true })[0]).toMatchObject({
      label: t('unfavorite'),
      icon: 'unfavorite',
    });
  });

  it('offers only restore for archived cards', () => {
    const actions = cardActions({ canHide: false, archived: true, fav: true });
    expect(keys(actions)).toEqual(['archive']);
    expect(actions[0]).toMatchObject({
      label: t('restore'),
      icon: 'unarchive',
    });
  });
});

describe('pressWhileSwiped', () => {
  it('lets the press through while closed', () => {
    expect(pressWhileSwiped(false, 0, 10_000)).toBe('press');
  });

  it('ignores the trailing press of the swipe', () => {
    expect(pressWhileSwiped(true, 1000, 1000 + SWIPE_TAIL_MS)).toBe('ignore');
  });

  it('closes the actions on a later tap', () => {
    expect(pressWhileSwiped(true, 1000, 1001 + SWIPE_TAIL_MS)).toBe('close');
  });
});
