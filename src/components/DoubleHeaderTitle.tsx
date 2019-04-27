import React from "react";
import { Platform, View } from "react-native";
import { iOSUIKit } from "react-native-typography";
import Text from "./Text";

export interface IDoubleHeaderTitleProps {
  readonly title: string;
  readonly subtitle: string;
}

const DoubleHeaderTitle: React.FunctionComponent<
  IDoubleHeaderTitleProps
> = props => {
  const { title, subtitle } = props;

  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[
          iOSUIKit.subheadEmphasizedWhite,
          Platform.OS === "android" ? { fontWeight: "bold" } : undefined,
          { textAlign: Platform.OS === "ios" ? "center" : "left" }
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          iOSUIKit.footnoteWhite,
          { textAlign: Platform.OS === "ios" ? "center" : "left" }
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
};

export default DoubleHeaderTitle;
