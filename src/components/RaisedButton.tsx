import React from 'react';
import {
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewProps,
  StyleSheet,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';
import Text from './Text';

export type IRaisedButtonProps = TouchableOpacityProps & {
  style?: ViewProps['style'];
  textStyle?: TextProps['style'];
  children: string;
};

const RaisedButton: React.FunctionComponent<IRaisedButtonProps> = props => {
  const {style, textStyle, onPress, children, testID} = props;

  return (
    <TouchableOpacity
      testID={testID}
      style={StyleSheet.compose(
        {
          alignItems: 'center',
          justifyContent: 'center',
          width: 60,
          height: 30,
          backgroundColor: 'lightblue',
          borderRadius: 8,
        },
        style,
      )}
      activeOpacity={Colors.activeOpacity}
      onPress={onPress}>
      <Text
        style={StyleSheet.compose(
          {fontSize: iOSUIKit.bodyObject.fontSize},
          textStyle,
        )}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default RaisedButton;
