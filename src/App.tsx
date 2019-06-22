import { Platform, UIManager } from "react-native";
import { Navigation } from "react-native-navigation";
import { getNavigationRoot } from "./navigation/navigationRoot";
import registerScreens from "./navigation/registerScreens";

const startApp = () => {
  Navigation.events().registerAppLaunchedListener(async () => {
    const a = new Promise((resolve, reject) => {
      throw new Error();
      return "asd";
    });
    const b = await a.catch(err => console.log(err));
    console.log(b);

    // tslint:disable-next-line
    console.disableYellowBox = true;

    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    registerScreens();
    const navigationRoot = await getNavigationRoot();

    Navigation.setRoot(navigationRoot);
  });
};

export default startApp;
