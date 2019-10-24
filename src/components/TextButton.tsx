import React from 'react';
import {
  Text,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Colors from '../constants/Colors';

export type ITextButtonProps = TouchableOpacityProps & {
  textStyle?: TextProps['style'];
  children: string;
  ellipsizeMode?: TextProps['ellipsizeMode'];
};

class TextButton extends React.Component<ITextButtonProps> {
  public render(): React.ReactElement {
    const {textStyle, children, ellipsizeMode} = this.props;
    return (
      <TouchableOpacity
        activeOpacity={Colors.activeOpacity}
        {...this.props}
        style={[{flex: 1}, this.props.style]}>
        <Text
          style={[
            {color: Colors.theme, fontSize: iOSUIKit.bodyObject.fontSize},
            textStyle,
          ]}
          numberOfLines={1}
          ellipsizeMode={ellipsizeMode || 'clip'}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }
}

export default TextButton;
