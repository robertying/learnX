import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { iOSUIKit } from "react-native-typography";
import packageConfig from "../../package.json";
import Text from "../components/Text";
import Colors from "../constants/Colors";
import { INavigationScreen } from "../types/NavigationScreen.js";

const deps: ReadonlyArray<any> = [
  ...Object.keys(packageConfig.dependencies),
  ...Object.keys(packageConfig.devDependencies)
];

const AcknowledgementsScreen: INavigationScreen<{}> = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: 30,
          paddingBottom: 30
        }}
      >
        <Text
          style={{
            alignSelf: "center",
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize
          }}
        >
          感谢 Harry Chen 提供的 thu-learn-lib 🎉
        </Text>
        <Text
          style={{
            alignSelf: "center",
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize
          }}
        >
          感谢 Yayu Xiao 制作的 Icon 👻
        </Text>
        <Text
          style={{
            alignSelf: "center",
            marginBottom: 20,
            fontSize: iOSUIKit.bodyObject.fontSize
          }}
        >
          致敬 JavaScript 开源社区 ❤️
        </Text>
        {deps.map((dep, index) => (
          <Text
            key={index}
            style={{
              fontSize: iOSUIKit.footnoteObject.fontSize,
              color: Colors.secondaryText,
              marginTop: 2,
              marginBottom: 2
            }}
          >
            {dep}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// tslint:disable-next-line: no-object-mutation
AcknowledgementsScreen.navigationOptions = {
  title: "致谢"
};

export default AcknowledgementsScreen;
