import { AppRegistry, Platform, UIManager } from "react-native";
import { name as appName } from "./app.json";
import App from "./src/App";

console.disableYellowBox = true;

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

AppRegistry.registerComponent(appName, () => App);
