import { PropsWithChildren, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ViewInstance } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Checkbox, Menu } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import * as Haptics from 'expo-haptics';
import DeviceInfo from 'constants/DeviceInfo';
import { CardAction, cardActions } from 'helpers/cardActions';
import useCardSwipe from 'hooks/useCardSwipe';
import CardActionIcon from './CardActionIcon';
import CardSwipeActions from './CardSwipeActions';
import Touchable from './Touchable';
import { useTheme } from 'theme';

const swipeableNotSupported = DeviceInfo.isWSA() || Platform.OS === 'android';

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
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  disableSwipe?: boolean;
}

const CardWrapper: React.FC<
  React.PropsWithChildren<PropsWithChildren<CardWrapperProps>>
> = ({
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
  checked,
  onCheck,
  disableSwipe,
}) => {
  const theme = useTheme();

  const { snapRef, openActions, onWillOpen, onWillClose, interceptPress } =
    useCardSwipe({ selectionMode, reorderMode });
  const anchorRef = useRef<ViewInstance>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const actions = cardActions({ fav, archived, hidden, canHide: !!onHide });

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
    } else if (!disableSwipe && !selectionMode) {
      if (swipeableNotSupported) {
        Haptics.selectionAsync();
        anchorRef.current?.measureInWindow((x, y, width, height) => {
          setMenuAnchor({ x: x + width, y: y + height });
          setMenuVisible(true);
        });
      } else {
        openActions();
      }
    }
  };

  const touchable = (
    <Touchable
      type="highlight"
      highlightColorOpacity={0.125}
      style={{ backgroundColor: theme.colors.surface }}
      onPress={
        reorderMode ? undefined : selectionMode ? handleCheck : handlePress
      }
      onLongPress={handleLongPress}
    >
      <View style={styles.root}>
        {selectionMode && (
          <View style={styles.checkbox}>
            <Checkbox.Android status={checked ? 'checked' : 'unchecked'} />
          </View>
        )}
        {reorderMode && (
          <MaterialIcons
            style={styles.checkbox}
            name="reorder"
            size={20}
            color={theme.colors.onSurface}
          />
        )}
        {children}
      </View>
    </Touchable>
  );

  if (swipeableNotSupported) {
    return (
      <View ref={anchorRef} collapsable={false}>
        {touchable}
        <Menu visible={menuVisible} onDismiss={closeMenu} anchor={menuAnchor}>
          {actions.map(action => (
            <Menu.Item
              key={action.key}
              testID={action.testID}
              leadingIcon={({ size }) => (
                <CardActionIcon action={action} size={size} />
              )}
              onPress={() => handleMenuAction(action)}
              title={action.label}
            />
          ))}
        </Menu>
      </View>
    );
  }

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
      {touchable}
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
});

export default CardWrapper;
