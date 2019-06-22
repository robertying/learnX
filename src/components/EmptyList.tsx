import React from "react";
import { Text, View } from "react-native";
import { iOSUIKit } from "react-native-typography";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getTranslation } from "../helpers/i18n";

const EmptyList: React.FunctionComponent = () => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 40
    }}
  >
    <Icon name="check-circle" color={iOSUIKit.footnoteObject.color} size={40} />
    <Text style={[iOSUIKit.footnote, { marginTop: 10 }]}>
      {getTranslation("emptyContent")}
    </Text>
  </View>
);

export default EmptyList;
