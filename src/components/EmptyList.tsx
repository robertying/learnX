import React from "react";
import { Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Colors from "../constants/Colors";

const EmptyList: React.FunctionComponent = () => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 40
    }}
  >
    <Icon name="check-circle" color={Colors.secondaryText} size={40} />
    <Text style={{ marginTop: 10, color: Colors.secondaryText, fontSize: 16 }}>
      无内容
    </Text>
  </View>
);

export default EmptyList;
