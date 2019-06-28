import { Platform, UIManager } from "react-native";
import { Navigation } from "react-native-navigation";
import { getAuthLoadingRoot } from "./navigation/navigationRoot";
import registerScreens from "./navigation/registerScreens";

const startApp = () => {
  Navigation.events().registerAppLaunchedListener(() => {
    // tslint:disable-next-line
    console.disableYellowBox = true;

    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    registerScreens();

    const authLoadingRoot = getAuthLoadingRoot();
    Navigation.setRoot(authLoadingRoot);
  });
};

export default startApp;
