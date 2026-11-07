// The actions a card offers when swiped (iOS) or long-pressed (Android, WSA).
import type MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import type MaterialIcons from '@react-native-vector-icons/material-icons';
import Colors from 'constants/Colors';
import { t } from './i18n';

export type CardActionIconName =
  | {
      set: 'material';
      name: React.ComponentProps<typeof MaterialIcons>['name'];
    }
  | {
      set: 'community';
      name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    };

export interface CardAction {
  key: 'hide' | 'fav' | 'archive';
  testID: string;
  label: string;
  icon: CardActionIconName;
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
        icon: {
          set: 'material',
          name: hidden ? 'visibility' : 'visibility-off',
        },
        color: Colors.yellow500,
        background: 'rgba(255,204,0,0.2)',
      },
    ];
  }

  const actions: CardAction[] = [];
  if (!archived) {
    actions.push({
      key: 'fav',
      testID: 'card-fav',
      label: fav ? t('unfavorite') : t('favorite'),
      icon: { set: 'community', name: fav ? 'heart-off' : 'heart' },
      color: Colors.red500,
      background: 'rgba(255,59,48,0.2)',
    });
  }
  actions.push({
    key: 'archive',
    testID: 'card-archive',
    label: archived ? t('restore') : t('archive'),
    icon: {
      set: 'community',
      name: archived ? 'archive-arrow-up' : 'archive-arrow-down',
    },
    color: Colors.blue500,
    background: 'rgba(33,150,243,0.2)',
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
