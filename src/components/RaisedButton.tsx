import React from "react";
import {
  TextProps,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewProps
} from "react-native";
import { iOSUIKit } from "react-native-typography";
import Colors from "../constants/Colors";
import Text from "./Text";

export type IRaisedButtonProps = TouchableOpacityProps & {
  readonly style?: ViewProps["style"];
  readonly textStyle?: TextProps["style"];
  readonly children: string;
};

const RaisedButton: React.FunctionComponent<IRaisedButtonProps> = props => {
  const { style, textStyle, onPress, children } = props;

  return (
    <TouchableOpacity
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          width: 60,
          height: 30,
          backgroundColor: "lightblue",
          borderRadius: 8
        },
        style
      ]}
      activeOpacity={Colors.activeOpacity}
      onPress={onPress}
    >
      <Text style={[{ fontSize: iOSUIKit.bodyObject.fontSize }, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export default RaisedButton;
