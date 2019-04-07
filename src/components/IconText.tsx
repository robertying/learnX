import React from "react";
import { View } from "react-native";
import { iOSUIKit } from "react-native-typography";
import { IconProps } from "react-native-vector-icons/Icon";
import Ionicons from "react-native-vector-icons/MaterialIcons";
import Text from "./Text";

export type IIconTextProps = IconProps & {
  readonly text: string;
};

const IconText: React.FunctionComponent<IIconTextProps> = props => {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Ionicons size={iOSUIKit.bodyObject.fontSize} {...props} />
      <Text style={[iOSUIKit.body, { marginLeft: 5, color: props.color }]}>
        {props.text}
      </Text>
    </View>
  );
};

export default IconText;
