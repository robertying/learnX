import React from "react";
import { Text, TextProps } from "react-native";

const CustomText: React.FunctionComponent<TextProps> = props => {
  const { style, ...restProps } = props;

  return (
    <Text style={[{ color: "black" }, style]} {...restProps}>
      {props.children}
    </Text>
  );
};

export default CustomText;
