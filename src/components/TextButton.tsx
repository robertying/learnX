import React from "react";
import {
  Text,
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps
} from "react-native";
import { iOSUIKit } from "react-native-typography";
import Colors from "../constants/Colors";

export type ITextButtonProps = TouchableOpacityProps & {
  readonly textStyle?: TextProps["style"];
  readonly children: string;
};

class TextButton extends React.Component<ITextButtonProps> {
  public render(): React.ReactElement {
    const { textStyle, children } = this.props;
    return (
      <TouchableOpacity activeOpacity={Colors.activeOpacity} {...this.props}>
        <Text
          style={[
            { color: Colors.tint, fontSize: iOSUIKit.bodyObject.fontSize },
            textStyle
          ]}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {children}
        </Text>
      </TouchableOpacity>
    );
  }
}

export default TextButton;
