import React from 'react';
import {
  Text,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';

export type ITextButtonProps = TouchableOpacityProps & {
  textStyle?: TextProps['style'];
  children: string;
  ellipsizeMode?: TextProps['ellipsizeMode'];
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  text: {color: Colors.theme, fontSize: iOSUIKit.bodyObject.fontSize},
});

class TextButton extends React.Component<ITextButtonProps> {
  render() {
    const {textStyle, children, ellipsizeMode} = this.props;
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        {...this.props}
        style={[styles.root, this.props.style]}>
        <Text
          style={[styles.text, textStyle]}
          numberOfLines={1}
          ellipsizeMode={ellipsizeMode || 'clip'}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }
}

export default TextButton;
