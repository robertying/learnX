import { PropsWithChildren, useState } from 'react';
import {
  AccessibilityActionEvent,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import * as Haptics from 'expo-haptics';
import DeviceInfo from 'constants/DeviceInfo';
import { CardAction, cardActions } from 'helpers/cardActions';
import { t } from 'helpers/i18n';
import useCardSwipe from 'hooks/useCardSwipe';
import CardMenu from './CardMenu';
import CardSwipeActions from './CardSwipeActions';
import Touchable from './Touchable';
import SelectionMark from './SelectionMark';
import { useTheme } from 'theme';
import { ContextMenuView } from 'modules/menus';

const swipeableNotSupported = Platform.OS === 'android';
// A pointer's right-click, or a long press on iPad, shows the actions in a
// menu, as everywhere else on these platforms.
const contextMenuSupported = DeviceInfo.isIPad() || DeviceInfo.isMac();

export interface CardWrapperProps {
  fav?: boolean;
  onFav?: (fav: boolean) => void;
  archived?: boolean;
  onArchive?: (archived: boolean) => void;
  hidden?: boolean;
  onHide?: (hide: boolean) => void;
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
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  disableSwipe?: boolean;
}

const CardWrapper: React.FC<PropsWithChildren<CardWrapperProps>> = ({
  fav,
  onFav,
  archived,
  onArchive,
  onHide,
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
  checked,
  onCheck,
  disableSwipe,
}) => {
  const theme = useTheme();

  const { snapRef, openActions, onWillOpen, onWillClose, interceptPress } =
    useCardSwipe({ selectionMode, reorderMode });

  const [menuVisible, setMenuVisible] = useState(false);

  const actions = cardActions({ fav, archived, hidden, canHide: !!onHide });
  const actionsEnabled = !disableSwipe && !selectionMode && !reorderMode;
  const moveActions =
    reorderMode && onMove
      ? [
          ...(canMoveUp
            ? [
                {
                  key: 'moveUp',
                  label: t('moveUp'),
                  systemImage: 'arrow.up' as const,
                  offset: -1 as const,
                },
              ]
            : []),
          ...(canMoveDown
            ? [
                {
                  key: 'moveDown',
                  label: t('moveDown'),
                  systemImage: 'arrow.down' as const,
                  offset: 1 as const,
                },
              ]
            : []),
        ]
      : [];

  const runAction = (action: CardAction) => {
    switch (action.key) {
      case 'fav':
        onFav?.(!fav);
        break;
      case 'archive':
        onArchive?.(!archived);
        break;
      case 'hide':
        onHide?.(!hidden);
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

  const renderRightActions = (
    _progress: SharedValue<number>,
    translation: SharedValue<number>,
    swipeableMethods: SwipeableMethods,
  ) => (
    <CardSwipeActions
      position="right"
      translation={translation}
      swipeableMethods={swipeableMethods}
      actions={actions}
      onAction={runAction}
    />
  );

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
      if (swipeableNotSupported) {
        void Haptics.selectionAsync();
        setMenuVisible(true);
      } else {
        openActions();
      }
    }
  };

  const touchable = (
    <Touchable
      type="highlight"
      style={{ backgroundColor: theme.colors.surface }}
      onPress={
        reorderMode ? undefined : selectionMode ? handleCheck : handlePress
      }
      onLongPress={handleLongPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={
        selectionMode ? 'checkbox' : reorderMode ? undefined : 'button'
      }
      accessibilityState={selectionMode ? { checked: !!checked } : undefined}
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
          <MaterialCommunityIcons
            style={styles.checkbox}
            name="reorder-horizontal"
            size={20}
            color={theme.colors.onSurface}
          />
        )}
        {children}
        {Platform.OS === 'ios' ? (
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        ) : null}
      </View>
    </Touchable>
  );

  if (swipeableNotSupported) {
    return (
      <View collapsable={false}>
        {touchable}
        <CardMenu
          visible={menuVisible}
          actions={actions}
          onAction={handleMenuAction}
          onDismiss={closeMenu}
        />
      </View>
    );
  }

  const content = contextMenuSupported ? (
    <ContextMenuView
      actions={
        actionsEnabled
          ? actions.map(a => ({
              key: a.key,
              title: a.label,
              systemImage: a.systemImage,
            }))
          : // A long press on iPad drags in reorder mode, so only the Mac's
            // right-click menu offers the moves.
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
    touchable
  );

  return (
    <ReanimatedSwipeable
      ref={snapRef}
      containerStyle={{ backgroundColor: theme.colors.surface }}
      childrenContainerStyle={{ backgroundColor: theme.colors.surface }}
      renderRightActions={renderRightActions}
      overshootFriction={8}
      enabled={!disableSwipe && !selectionMode && !reorderMode}
      onSwipeableWillOpen={onWillOpen}
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
