import { PropsWithChildren, useState } from 'react';
import {
  AccessibilityActionEvent,
  View,
  StyleSheet,
  Platform,
  PlatformColor,
} from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import DeviceInfo from 'constants/DeviceInfo';
import { useSettings } from 'data/settings';
import { CardAction, cardActions, swipeAction } from 'helpers/cardActions';
import { t } from 'helpers/i18n';
import { systemIcons } from 'helpers/systemIcons';
import useCardSwipe from 'hooks/useCardSwipe';
import CardMenu from './CardMenu';
import CardSwipeAction, { SwipeSide } from './CardSwipeAction';
import Touchable from './Touchable';
import SelectionMark from './SelectionMark';
import SystemIcon from './SystemIcon';
import { useTheme } from 'theme';
import { ContextMenuView } from 'modules/menus';
import { playHaptic } from 'services/haptics';

// A long press (or a pointer's right-click) shows the actions in a menu: the
// system context menu on iOS, iPadOS and Mac, a Material dropdown on Android.
const contextMenuSupported = Platform.OS === 'ios';

export interface CardWrapperProps {
  fav?: boolean;
  /** Favorites the item, or removes it from favorites when `fav`. */
  onToggleFav?: () => void;
  archived?: boolean;
  /** Archives the item, or restores it when `archived`. */
  onToggleArchived?: () => void;
  hidden?: boolean;
  /** Hides the course, or shows it again when `hidden`. Only courses hide. */
  onToggleHidden?: () => void;
  onPress?: () => void;
  selectionMode?: boolean;
  reorderMode?: boolean;
  /** Starts dragging the card; set only inside a reorderable list. */
  onDrag?: () => void;
  /**
   * Moves the card one place up or down in reorder mode: the way to reorder
   * without dragging (VoiceOver, TalkBack, Switch Control, keyboards).
   */
  onMove?: (offset: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** What screen readers say for the card, in place of its texts in order. */
  accessibilityLabel?: string;
  /** Finds the card in tests, e.g. the first `notice-card` in a live E2E run. */
  testID?: string;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  /**
   * The item open in the detail pane beside the list: the row stays filled,
   * as a selected table cell or Material's selected list item.
   */
  opened?: boolean;
  /**
   * No swipe, menu or accessibility actions, for a card that only opens (as
   * in search results). Selection and reorder mode turn them off too.
   */
  actionsDisabled?: boolean;
  /**
   * No swipe, for a card in a pager that swipes between its pages; the menu
   * and accessibility actions stay.
   */
  swipeDisabled?: boolean;
  /**
   * The last row of its list or section: no separator under it, which would
   * otherwise sit on the tab bar or the next section's header.
   */
  last?: boolean;
}

// UITableViewCell's selected background, as a pressed row shows it
// (`Touchable`); Material's selected list item.
const openedBackground = (theme: ReturnType<typeof useTheme>) =>
  Platform.OS === 'ios'
    ? PlatformColor('systemGray4')
    : theme.colors.secondaryContainer;

const CardWrapper: React.FC<PropsWithChildren<CardWrapperProps>> = ({
  fav,
  onToggleFav,
  archived,
  onToggleArchived,
  onToggleHidden,
  hidden,
  onPress,
  children,
  selectionMode,
  reorderMode,
  onDrag,
  onMove,
  canMoveUp,
  canMoveDown,
  accessibilityLabel,
  testID,
  checked,
  onCheck,
  opened,
  actionsDisabled,
  swipeDisabled,
  last,
}) => {
  const theme = useTheme();
  const swipeSettings = useSettings(settings => settings.swipeActions);

  const [menuVisible, setMenuVisible] = useState(false);
  // Android's menu is a Compose view: mounted on the card's first long press,
  // not with every row.
  const [menuMounted, setMenuMounted] = useState(false);

  const actions = cardActions({
    fav,
    archived,
    hidden,
    canHide: !!onToggleHidden,
  });
  const actionsEnabled = !actionsDisabled && !selectionMode && !reorderMode;
  // One action each way, as chosen in Settings › Swipe Actions
  const swipeActions: Record<SwipeSide, CardAction | undefined> = {
    leading: swipeAction(actions, swipeSettings.right),
    trailing: swipeAction(actions, swipeSettings.left),
  };
  const rowWidth = useSharedValue(0);
  const moveActions =
    reorderMode && onMove
      ? [
          ...(canMoveUp
            ? [
                {
                  key: 'moveUp',
                  label: t('moveUp'),
                  systemImage: systemIcons.moveUp.ios,
                  offset: -1 as const,
                },
              ]
            : []),
          ...(canMoveDown
            ? [
                {
                  key: 'moveDown',
                  label: t('moveDown'),
                  systemImage: systemIcons.moveDown.ios,
                  offset: 1 as const,
                },
              ]
            : []),
        ]
      : [];

  const runAction = (action: CardAction) => {
    switch (action.key) {
      case 'fav':
        onToggleFav?.();
        break;
      case 'archive':
        onToggleArchived?.();
        break;
      case 'hide':
        onToggleHidden?.();
        break;
    }
  };

  const runMove = (key: string) => {
    const move = moveActions.find(m => m.key === key);
    if (move) {
      onMove?.(move.offset);
      return true;
    }
    return false;
  };

  const handleAccessibilityAction = ({
    nativeEvent,
  }: AccessibilityActionEvent) => {
    if (runMove(nativeEvent.actionName)) {
      return;
    }
    const action = actions.find(a => a.key === nativeEvent.actionName);
    if (action && actionsEnabled) {
      runAction(action);
    }
  };

  const handleContextMenuAction = ({
    nativeEvent,
  }: {
    nativeEvent: { key: string };
  }) => {
    if (runMove(nativeEvent.key)) {
      return;
    }
    const action = actions.find(a => a.key === nativeEvent.key);
    if (action) {
      runAction(action);
    }
  };

  const runSwipe = (side: SwipeSide) => {
    const action = swipeActions[side];
    if (action) {
      runAction(action);
    }
  };

  const {
    snapRef,
    close,
    onArmedChange,
    onStartDrag,
    onWillOpen,
    onOpen,
    onWillClose,
    interceptPress,
  } = useCardSwipe({ selectionMode, reorderMode, onSwipe: runSwipe });

  const handleCheck = () => {
    onCheck?.(!checked);
  };

  const closeMenu = () => setMenuVisible(false);

  const handleMenuAction = (action: CardAction) => {
    closeMenu();
    runAction(action);
  };

  if ((selectionMode || reorderMode) && menuVisible) {
    setMenuVisible(false);
  }

  const renderSwipeAction =
    (side: SwipeSide) =>
    (_progress: SharedValue<number>, translation: SharedValue<number>) => {
      const action = swipeActions[side];
      return action ? (
        <CardSwipeAction
          side={side}
          action={action}
          translation={translation}
          rowWidth={rowWidth}
          onArmedChange={armed => onArmedChange(side, armed)}
          onPress={() => {
            runAction(action);
            close();
          }}
        />
      ) : null;
    };

  const handlePress = () => {
    if (menuVisible) {
      closeMenu();
      return;
    }
    if (interceptPress()) {
      return;
    }
    onPress?.();
  };

  const handleLongPress = () => {
    if (reorderMode) {
      onDrag?.();
    } else if (actionsEnabled && !contextMenuSupported) {
      playHaptic('longPress');
      setMenuMounted(true);
      setMenuVisible(true);
    }
  };

  const touchable = (
    <Touchable
      type="highlight"
      style={{
        backgroundColor: opened
          ? openedBackground(theme)
          : theme.colors.surface,
      }}
      onPress={
        reorderMode ? undefined : selectionMode ? handleCheck : handlePress
      }
      onLongPress={handleLongPress}
      onLayout={({ nativeEvent }) => rowWidth.set(nativeEvent.layout.width)}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={
        selectionMode ? 'checkbox' : reorderMode ? undefined : 'button'
      }
      accessibilityState={
        selectionMode
          ? { checked: !!checked }
          : opened
            ? { selected: true }
            : undefined
      }
      // Swipe, long press and drag aren't reachable with VoiceOver or TalkBack.
      accessibilityActions={
        actionsEnabled
          ? actions.map(a => ({ name: a.key, label: a.label }))
          : moveActions.length
            ? moveActions.map(m => ({ name: m.key, label: m.label }))
            : undefined
      }
      onAccessibilityAction={handleAccessibilityAction}
    >
      <View style={styles.root}>
        {selectionMode && (
          <View style={styles.checkbox}>
            <SelectionMark checked={!!checked} />
          </View>
        )}
        {reorderMode && (
          <SystemIcon
            testID="reorder-handle"
            style={styles.checkbox}
            name="dragHandle"
            size={20}
            color={theme.colors.onSurface}
          />
        )}
        {children}
        {Platform.OS === 'ios' && !last ? (
          <View
            testID="card-separator"
            style={[
              styles.separator,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        ) : null}
      </View>
    </Touchable>
  );

  const content = contextMenuSupported ? (
    <ContextMenuView
      actions={
        actionsEnabled
          ? actions.map(a => ({
              key: a.key,
              title: a.label,
              systemImage: systemIcons[a.icon].ios,
            }))
          : // A long press drags in reorder mode on iPhone and iPad, so only
            // the Mac's right-click menu offers the moves.
            DeviceInfo.isMac()
            ? moveActions.map(m => ({
                key: m.key,
                title: m.label,
                systemImage: m.systemImage,
              }))
            : []
      }
      onAction={handleContextMenuAction}
    >
      {touchable}
    </ContextMenuView>
  ) : (
    <View collapsable={false}>
      {touchable}
      {menuMounted ? (
        <CardMenu
          visible={menuVisible}
          actions={actions}
          onAction={handleMenuAction}
          onDismiss={closeMenu}
        />
      ) : null}
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={snapRef}
      containerStyle={{ backgroundColor: theme.colors.surface }}
      childrenContainerStyle={{ backgroundColor: theme.colors.surface }}
      renderLeftActions={
        swipeActions.leading ? renderSwipeAction('leading') : undefined
      }
      renderRightActions={
        swipeActions.trailing ? renderSwipeAction('trailing') : undefined
      }
      // The card follows the finger past the button (iOS), as far as the
      // full-swipe point and beyond.
      overshootLeft={Platform.OS === 'ios'}
      overshootRight={Platform.OS === 'ios'}
      enabled={
        actionsEnabled &&
        !swipeDisabled &&
        !!(swipeActions.leading || swipeActions.trailing)
      }
      onSwipeableOpenStartDrag={onStartDrag}
      onSwipeableWillOpen={onWillOpen}
      onSwipeableOpen={onOpen}
      onSwipeableWillClose={onWillClose}
    >
      {content}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 8,
  },
  // An inset hairline between rows, as in iOS and Mac lists.
  separator: {
    position: 'absolute',
    left: 16,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});

export default CardWrapper;
