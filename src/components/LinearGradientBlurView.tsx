import { BlurView } from "@react-native-community/blur";
import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Colors from "../constants/Colors";

export type ILinearGradientBlurViewProps = ViewProps;

const LinearGradientBlurView: React.FunctionComponent<
  ILinearGradientBlurViewProps
> = props => (
  <View
    style={[
      { flex: 1, justifyContent: "center", alignItems: "center" },
      props.style
    ]}
  >
    <BlurView blurAmount={75} blurType="dark" style={styles.absolute} />
    <LinearGradient
      colors={Colors.headerGradient}
      style={styles.absolute}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {props.children}
    </LinearGradient>
  </View>
);

export default LinearGradientBlurView;

const styles = StyleSheet.create({
  absolute: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  }
});
