import React from "react";
import { ActivityIndicator } from "react-native";

const AnimatingActivityIndicator: React.FC = () => (
  <ActivityIndicator
    style={{
      flex: 1,
      alignSelf: "center",
      position: "absolute",
      top: 44 + 52 - 10
    }}
    color="gray"
    animating={true}
  />
);

export default AnimatingActivityIndicator;
