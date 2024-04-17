import {PropsWithChildren, useRef, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme, Checkbox} from 'react-native-paper';
import Interactable from 'react-native-interactable';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from 'constants/Colors';
import Touchable from './Touchable';

export interface CardWrapperProps {
  fav?: boolean;
  onFav?: (fav: boolean) => void;
  archived?: boolean;
  onArchive?: (archived: boolean) => void;
  hidden?: boolean;
  onHide?: (hide: boolean) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  selectionMode?: boolean;
  reorderMode?: boolean;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  disableSwipe?: boolean;
}

const buttonWidth = 80;

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
  onLongPress,
  children,
  selectionMode,
  reorderMode,
  checked,
  onCheck,
  disableSwipe,
}) => {
  const theme = useTheme();

  const snapRef = useRef<any>(null);

  const resetSnap = () => {
    snapRef.current?.snapTo({index: 0});
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

  const handleCheck = () => {
    onCheck?.(!checked);
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

  return (
    <View>
      {reorderMode ? null : (
        <View style={styles.drawer}>
          {onHide ? (
            <Touchable
              type="opacity"
              style={[
                styles.button,
                {
                  backgroundColor: 'rgba(255,204,0,0.2)',
                },
              ]}
              onPress={handleHide}>
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
                  onPress={handleFav}>
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
                onPress={handleArchive}>
                <MaterialCommunityIcons
                  name={archived ? 'archive-arrow-up' : 'archive-arrow-down'}
                  size={40}
                  color={Colors.blue500}
                />
              </Touchable>
            </>
          )}
        </View>
      )}
      <Interactable.View
        style={{backgroundColor: theme.colors.surface}}
        ref={snapRef}
        animatedNativeDriver={true}
        horizontalOnly={true}
        boundaries={{
          left: onHide ? -buttonWidth : -buttonWidth * (archived ? 1 : 2),
          right: buttonWidth,
          bounce: 0.8,
        }}
        snapPoints={[
          {x: 0},
          {x: onHide ? -buttonWidth : -buttonWidth * (archived ? 1 : 2)},
        ]}
        dragEnabled={!disableSwipe && !selectionMode && !reorderMode}>
        <Touchable
          type="highlight"
          highlightColorOpacity={0.125}
          style={{backgroundColor: theme.colors.surface}}
          onPress={
            reorderMode
              ? undefined
              : selectionMode
                ? handleCheck
                : () => {
                    resetSnap();
                    onPress?.();
                  }
          }
          onLongPress={onLongPress}>
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
      </Interactable.View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
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
