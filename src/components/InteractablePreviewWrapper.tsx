import * as Haptics from 'expo-haptics';
import React, {PropsWithChildren, useRef} from 'react';
import {
  Platform,
  TouchableNativeFeedback,
  TouchableHighlight,
  View,
} from 'react-native';
import Interactable from 'react-native-interactable';
import Colors from '../constants/Colors';
import {useDarkMode} from 'react-native-dark-mode';
import Button from './Button';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
    onPinned && onPinned(!pinned);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (snapRef.current) {
      snapRef.current.snapTo({index: 0});
    }
  };

  const handleFav = () => {
    onFav && onFav(!fav);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (snapRef.current) {
      snapRef.current.snapTo({index: 0});
    }
  };

  const handleHide = () => {
    onHide && onHide(!hidden);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (snapRef.current) {
      snapRef.current.snapTo({index: 0});
    }
  };

  const handleRemind = () => {
    onRemind && onRemind();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (snapRef.current) {
      snapRef.current.snapTo({index: 0});
    }
  };

  const isDarkMode = useDarkMode();

  const buttonWidth = 90;

  return (
    <View>
      {Platform.OS === 'ios' && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            left: 0,
            top: 0,
            bottom: 0,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
          {onHide ? (
            <Button
              style={{
                height: '100%',
                width: buttonWidth,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255,204,0,0.2)',
              }}
              onPress={handleHide}>
              <MaterialIcons
                name={hidden ? 'visibility' : 'visibility-off'}
                size={40}
                color={isDarkMode ? Colors.yellowDark : Colors.yellowLight}
              />
            </Button>
          ) : (
            <>
              <Button
                style={{
                  height: '100%',
                  width: buttonWidth,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,59,48,0.2)',
                }}
                onPress={handleFav}>
                <MaterialCommunityIcons
                  name={fav ? 'heart-off' : 'heart'}
                  size={40}
                  color={isDarkMode ? Colors.redDark : Colors.redLight}
                />
              </Button>
              <Button
                style={{
                  height: '100%',
                  width: buttonWidth,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(175,82,222,0.2)',
                }}
                onPress={handlePin}>
                <MaterialCommunityIcons
                  name={pinned ? 'pin-off' : 'pin'}
                  size={40}
                  color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
                />
              </Button>
              <Button
                style={{
                  height: '100%',
                  width: buttonWidth,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(52,199,89,0.2)',
                }}
                onPress={handleRemind}>
                <MaterialCommunityIcons
                  name="timer"
                  size={40}
                  color={isDarkMode ? Colors.greenDark : Colors.greenLight}
                />
              </Button>
            </>
          )}
        </View>
      )}
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
            underlayColor={isDarkMode ? 'white' : 'black'}
            onPress={onPress}>
            {props.children}
          </TouchableHighlight>
        ) : (
          <TouchableNativeFeedback
            onPress={onPress}
            background={TouchableNativeFeedback.Ripple(
              Colors.background,
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
