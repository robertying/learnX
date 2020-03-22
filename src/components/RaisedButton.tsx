import React from 'react';
import {
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewProps,
  StyleSheet,
  Text,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';

export type IRaisedButtonProps = TouchableOpacityProps & {
  style?: ViewProps['style'];
  textStyle?: TextProps['style'];
  children: string;
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 30,
    backgroundColor: Colors.system('purple'),
    borderRadius: 8,
  },
  text: {
    fontSize: iOSUIKit.bodyObject.fontSize,
  },
});

const RaisedButton: React.FunctionComponent<IRaisedButtonProps> = props => {
  const {style, textStyle, onPress, children, testID} = props;

  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.root, style]}
      activeOpacity={0.6}
      onPress={onPress}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
};

export default RaisedButton;
