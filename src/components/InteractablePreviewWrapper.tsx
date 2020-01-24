import * as Haptics from 'expo-haptics';
import React, {PropsWithChildren, useRef} from 'react';
import {
  Platform,
  TouchableNativeFeedback,
  TouchableHighlight,
  View,
  StyleSheet,
} from 'react-native';
import Interactable from 'react-native-interactable';
import Colors from '../constants/Colors';
import Button from './Button';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useColorScheme} from 'react-native-appearance';

export interface IInteractablePreviewWrapperProps {
  hidden?: boolean;
  onHide?: (hide: boolean) => void;
  pinned?: boolean;
  fav?: boolean;
  onPinned?: (pin: boolean) => void;
  onFav?: (fav: boolean) => void;
  onRemind?: () => void;
  onPress: TouchableHighlight['props']['onPress'];
  dragEnabled: boolean;
}

const buttonWidth = 90;

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
});

function InteractablePreviewWrapper(
  props: PropsWithChildren<IInteractablePreviewWrapperProps>,
): React.ReactElement {
  const {
    pinned,
    onPinned,
    fav,
    onFav,
    onPress,
    dragEnabled,
    onHide,
    hidden,
    onRemind,
  } = props;

  const snapRef = useRef<any>(null);

  const handlePin = () => {
    onPinned?.(!pinned);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snapRef.current?.snapTo({index: 0});
  };

  const handleFav = () => {
    onFav?.(!fav);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snapRef.current?.snapTo({index: 0});
  };

  const handleHide = () => {
    onHide?.(!hidden);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snapRef.current?.snapTo({index: 0});
  };

  const handleRemind = () => {
    onRemind?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snapRef.current?.snapTo({index: 0});
  };

  const colorScheme = useColorScheme();

  return (
    <View>
      <View style={styles.drawer}>
        {onHide ? (
          <Button
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
              color={Colors.system('yellow', colorScheme)}
            />
          </Button>
        ) : (
          <>
            <Button
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
                color={Colors.system('red', colorScheme)}
              />
            </Button>
            <Button
              style={[
                styles.button,
                {
                  backgroundColor: 'rgba(175,82,222,0.2)',
                },
              ]}
              onPress={handlePin}>
              <MaterialCommunityIcons
                name={pinned ? 'pin-off' : 'pin'}
                size={40}
                color={Colors.system('purple', colorScheme)}
              />
            </Button>
            <Button
              style={[
                styles.button,
                {
                  backgroundColor: 'rgba(52,199,89,0.2)',
                },
              ]}
              onPress={handleRemind}>
              <MaterialCommunityIcons
                name="timer"
                size={40}
                color={Colors.system('green', colorScheme)}
              />
            </Button>
          </>
        )}
      </View>
      <Interactable.View
        testID="InteractableCard"
        ref={snapRef}
        animatedNativeDriver={true}
        horizontalOnly={true}
        boundaries={{
          left: onHide ? -buttonWidth : -buttonWidth * 3,
          right: buttonWidth,
          bounce: 0.8,
        }}
        snapPoints={[{x: 0}, {x: onHide ? -buttonWidth : -buttonWidth * 3}]}
        dragEnabled={dragEnabled}>
        {Platform.OS === 'ios' ? (
          <TouchableHighlight
            underlayColor={Colors.system('foreground', colorScheme)}
            onPress={onPress}>
            {props.children}
          </TouchableHighlight>
        ) : (
          <TouchableNativeFeedback
            onPress={onPress}
            background={TouchableNativeFeedback.Ripple(
              colorScheme === 'dark'
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.2)',
              false,
            )}>
            {props.children}
          </TouchableNativeFeedback>
        )}
      </Interactable.View>
    </View>
  );
}

export default InteractablePreviewWrapper;
