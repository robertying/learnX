import React from "react";
import { Platform, SafeAreaView, View } from "react-native";
import DeviceInfo from "react-native-device-info";
import { Header } from "react-navigation";
import Layout from "../constants/Layout";
import LinearGradientBlurView from "./LinearGradientBlurView";

const SplashScreen = () => (
  <>
    <LinearGradientBlurView
      style={{
        flex: undefined,
        height:
          DeviceInfo.isTablet() && Platform.OS === "ios"
            ? Header.HEIGHT + 4
            : Platform.OS === "ios"
            ? 44 + Layout.statusBarHeight
            : Header.HEIGHT + Layout.statusBarHeight
      }}
    />
    <SafeAreaView
      style={{
        backgroundColor: "white",
        flex: 1
      }}
    >
      <View style={{ backgroundColor: "#f0f0f0", flex: 1 }} />
      <View
        style={{
          height: Platform.OS === "android" ? 50 : 49,
          backgroundColor: "white"
        }}
      />
    </SafeAreaView>
  </>
);

export default SplashScreen;
