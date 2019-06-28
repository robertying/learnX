import React from "react";
import { SafeAreaView } from "react-native";
import EmptyList from "./EmptyList";

const EmptyScreen: React.FC<{}> = () => (
  <SafeAreaView
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    }}
  >
    <EmptyList />
  </SafeAreaView>
);

export default EmptyScreen;
