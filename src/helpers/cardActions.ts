// The actions a card offers when swiped (iOS), long-pressed (Android) or
// right-clicked (iPad, Mac), and as accessibility actions everywhere.
import { statusColors, withAlpha } from 'theme';
import { t } from './i18n';
import type { SystemIconName } from './systemIcons';

// Light-mode system colors: the swipe buttons tint them at 20%, which works on
// both light and dark cards.
const status = statusColors.light;

export interface CardAction {
  key: 'hide' | 'fav' | 'archive';
  testID: string;
  label: string;
  icon: SystemIconName;
  color: string;
  /** Swipe button background */
  background: string;
}

/**
 * Courses can only be hidden or shown. Other cards can be favorited and
 * archived; archived ones only restored.
 */
export const cardActions = ({
  fav,
  archived,
  hidden,
  canHide,
}: {
  fav?: boolean;
  archived?: boolean;
  hidden?: boolean;
  canHide: boolean;
}): CardAction[] => {
  if (canHide) {
    return [
      {
        key: 'hide',
        testID: 'card-hide',
        label: hidden ? t('unhide') : t('hide'),
        icon: hidden ? 'show' : 'hide',
        color: status.yellow,
        background: withAlpha(status.yellow, 0.2),
      },
    ];
  }

  const actions: CardAction[] = [];
  if (!archived) {
    actions.push({
      key: 'fav',
      testID: 'card-fav',
      label: fav ? t('unfavorite') : t('favorite'),
      icon: fav ? 'unfavorite' : 'favorite',
      color: status.red,
      background: withAlpha(status.red, 0.2),
    });
  }
  actions.push({
    key: 'archive',
    testID: 'card-archive',
    label: archived ? t('restore') : t('archive'),
    icon: archived ? 'unarchive' : 'archive',
    color: status.blue,
    background: withAlpha(status.blue, 0.2),
  });
  return actions;
};

/** How long after the swipe actions open a press still counts as the swipe */
export const SWIPE_TAIL_MS = 500;

/**
 * What a press on the card does while its swipe actions may be open:
 * revealing them emits a trailing press on iOS, which is ignored; a later tap
 * closes them; with them closed the press goes through.
 */
export const pressWhileSwiped = (
  open: boolean,
  openedAt: number,
  now: number,
): 'press' | 'ignore' | 'close' => {
  if (!open) {
    return 'press';
  }
  return now - openedAt > SWIPE_TAIL_MS ? 'close' : 'ignore';
};
