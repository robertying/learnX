import React from "react";
import { Platform, SafeAreaView, View } from "react-native";
import Layout from "../constants/Layout";
import LinearGradientBlurView from "./LinearGradientBlurView";

const SplashScreen = () => (
  <>
    <LinearGradientBlurView
      style={{
        flex: undefined,
        height: Layout.statusBarHeight + (Platform.OS === "android" ? 56 : 44)
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
