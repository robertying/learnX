import {
  PropsWithChildren,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { useTheme, Checkbox, Menu } from 'react-native-paper';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import * as Haptics from 'expo-haptics';
import Colors from 'constants/Colors';
import DeviceInfo from 'constants/DeviceInfo';
import { t } from 'helpers/i18n';
import Touchable from './Touchable';

const swipeableNotSupported = DeviceInfo.isWSA() || Platform.OS === 'android';

const buttonWidth = 80;

const SwipeActions: React.FC<{
  position: 'left' | 'right';
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  swipeableMethods: SwipeableMethods;
  fav?: boolean;
  onFav?: (fav: boolean) => void;
  archived?: boolean;
  onArchive?: (archived: boolean) => void;
  hidden?: boolean;
  onHide?: (hide: boolean) => void;
}> = ({
  position,
  translation,
  swipeableMethods,
  onHide,
  hidden,
  onArchive,
  archived,
  onFav,
  fav,
}) => {
  const totalButtonWidth = onHide
    ? buttonWidth
    : buttonWidth * (archived ? 1 : 2);

  const actionStyle = useAnimatedStyle(() => {
    return {
      translateX:
        position === 'right'
          ? translation.get() + totalButtonWidth
          : translation.get() - totalButtonWidth,
    };
  });

  const resetSnap = () => {
    swipeableMethods.close();
  };

  const handleFav = () => {
    onFav?.(!fav);
    resetSnap();
  };

  const handleArchive = () => {
    onArchive?.(!archived);
    resetSnap();
  };

  const handleHide = () => {
    onHide?.(!hidden);
    resetSnap();
  };

  return (
    <Animated.View
      style={[styles.drawer, { width: totalButtonWidth }, actionStyle]}
    >
      {onHide ? (
        <Touchable
          type="opacity"
          style={[
            styles.button,
            {
              backgroundColor: 'rgba(255,204,0,0.2)',
            },
          ]}
          onPress={handleHide}
        >
          <MaterialIcons
            name={hidden ? 'visibility' : 'visibility-off'}
            size={40}
            color={Colors.yellow500}
          />
        </Touchable>
      ) : (
        <>
          {archived ? null : (
            <Touchable
              type="opacity"
              style={[
                styles.button,
                {
                  backgroundColor: 'rgba(255,59,48,0.2)',
                },
              ]}
              onPress={handleFav}
            >
              <MaterialCommunityIcons
                name={fav ? 'heart-off' : 'heart'}
                size={40}
                color={Colors.red500}
              />
            </Touchable>
          )}
          <Touchable
            type="opacity"
            style={[
              styles.button,
              {
                backgroundColor: 'rgba(33,150,243,0.2)',
              },
            ]}
            onPress={handleArchive}
          >
            <MaterialCommunityIcons
              name={archived ? 'archive-arrow-up' : 'archive-arrow-down'}
              size={40}
              color={Colors.blue500}
            />
          </Touchable>
        </>
      )}
    </Animated.View>
  );
};

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
  checked,
  onCheck,
  disableSwipe,
}) => {
  const theme = useTheme();

  const drag = useReorderableDrag();

  const snapRef = useRef<SwipeableMethods>(null);
  const anchorRef = useRef<View>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });

  const resetSnap = () => {
    snapRef.current?.close();
  };

  const handleCheck = () => {
    onCheck?.(!checked);
  };

  const closeMenu = () => setMenuVisible(false);

  const handleMenuFav = () => {
    closeMenu();
    onFav?.(!fav);
  };

  const handleMenuArchive = () => {
    closeMenu();
    onArchive?.(!archived);
  };

  const handleMenuHide = () => {
    closeMenu();
    onHide?.(!hidden);
  };

  useEffect(() => {
    if (selectionMode) {
      resetSnap();
    }
  }, [selectionMode]);

  useEffect(() => {
    if (reorderMode) {
      resetSnap();
    }
  }, [reorderMode]);

  useEffect(() => {
    if (selectionMode || reorderMode) {
      closeMenu();
    }
  }, [selectionMode, reorderMode]);

  const renderRightActions = useCallback(
    (
      progress: SharedValue<number>,
      translation: SharedValue<number>,
      swipeableMethods: SwipeableMethods,
    ) => {
      return (
        <SwipeActions
          position="right"
          progress={progress}
          translation={translation}
          swipeableMethods={swipeableMethods}
          fav={fav}
          onFav={onFav}
          archived={archived}
          onArchive={onArchive}
          hidden={hidden}
          onHide={onHide}
        />
      );
    },
    [archived, fav, hidden, onArchive, onFav, onHide],
  );

  const handlePress = () => {
    if (menuVisible) {
      closeMenu();
      return;
    }
    resetSnap();
    onPress?.();
  };

  const handleLongPress = () => {
    if (reorderMode) {
      drag();
    } else if (!disableSwipe && !selectionMode) {
      if (swipeableNotSupported) {
        Haptics.selectionAsync();
        anchorRef.current?.measureInWindow((x, y, width, height) => {
          setMenuAnchor({ x: x + width, y: y + height });
          setMenuVisible(true);
        });
      } else {
        snapRef.current?.openRight();
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
          {onHide ? (
            <Menu.Item
              leadingIcon={({ size }) => (
                <MaterialIcons
                  name={hidden ? 'visibility' : 'visibility-off'}
                  size={size}
                  color={Colors.yellow500}
                />
              )}
              onPress={handleMenuHide}
              title={hidden ? t('unhide') : t('hide')}
            />
          ) : (
            <>
              {archived ? null : (
                <Menu.Item
                  leadingIcon={({ size }) => (
                    <MaterialCommunityIcons
                      name={fav ? 'heart-off' : 'heart'}
                      size={size}
                      color={Colors.red500}
                    />
                  )}
                  onPress={handleMenuFav}
                  title={fav ? t('unfavorite') : t('favorite')}
                />
              )}
              <Menu.Item
                leadingIcon={({ size }) => (
                  <MaterialCommunityIcons
                    name={archived ? 'archive-arrow-up' : 'archive-arrow-down'}
                    size={size}
                    color={Colors.blue500}
                  />
                )}
                onPress={handleMenuArchive}
                title={archived ? t('restore') : t('archive')}
              />
            </>
          )}
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
    >
      {touchable}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  drawer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    height: '100%',
    width: buttonWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
