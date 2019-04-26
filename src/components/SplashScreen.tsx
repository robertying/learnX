import React from "react";
import { Platform, View } from "react-native";
import Layout from "../constants/Layout";
import LinearGradientBlurView from "./LinearGradientBlurView";

const SplashScreen = () => (
  <View
    style={{
      backgroundColor: "#f0f0f0",
      flex: 1
    }}
  >
    <LinearGradientBlurView
      style={{
        flex: undefined,
        height: Layout.statusBarHeight + (Platform.OS === "android" ? 56 : 44)
      }}
    />
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === "android" ? 50 : 82,
        backgroundColor: "white"
      }}
    />
  </View>
);

export default SplashScreen;
