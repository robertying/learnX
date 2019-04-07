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

const TextButton: React.FunctionComponent<ITextButtonProps> = props => {
  const { textStyle, children } = props;

  return (
    <TouchableOpacity activeOpacity={Colors.activeOpacity} {...props}>
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
};

export default TextButton;
