import * as Haptics from 'expo-haptics';
import React, {PropsWithChildren} from 'react';
import {Platform, TouchableNativeFeedback} from 'react-native';
import {TouchableHighlight} from 'react-native-gesture-handler';
import Interactable from 'react-native-interactable';
import {TouchablePreview} from 'react-native-navigation/lib/dist/adapters/TouchablePreview';
import Colors from '../constants/Colors';
import {useDarkMode} from 'react-native-dark-mode';

export interface IInteractablePreviewWrapperProps {
  readonly pinned?: boolean;
  readonly onPinned?: (pin: boolean) => void;
  readonly onPress?: TouchablePreview['props']['onPress'];
  readonly onPressIn?: TouchablePreview['props']['onPressIn'];
  readonly dragEnabled: boolean;
}

function InteractablePreviewWrapper(
  props: PropsWithChildren<IInteractablePreviewWrapperProps>,
): React.ReactElement {
  const {pinned, onPinned, onPress, dragEnabled} = props;

  const onDrag = (event: Interactable.IDragEvent) => {
    if (Math.abs(event.nativeEvent.x) > 150) {
      onPinned!(!pinned);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isDarkMode = useDarkMode();

  return (
    <Interactable.View
      animatedNativeDriver={true}
      horizontalOnly={true}
      snapPoints={[{x: 0}]}
      onDrag={onDrag}
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
          background={TouchableNativeFeedback.Ripple(Colors.background, false)}>
          {props.children}
        </TouchableNativeFeedback>
      )}
    </Interactable.View>
  );
}

export default InteractablePreviewWrapper;
