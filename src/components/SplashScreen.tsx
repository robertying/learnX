import React from "react";
import { View } from "react-native";
import Colors from "../constants/Colors";
import Text from "./Text";

const SplashScreen = () => (
  <View
    style={{
      backgroundColor: "white",
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
    }}
  >
    <Text style={{ fontSize: 150, color: Colors.tint }}>X</Text>
  </View>
);

export default SplashScreen;
