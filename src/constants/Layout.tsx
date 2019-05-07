import Constants from "expo-constants";
import { Dimensions, Platform } from "react-native";
import ExtraDimensions from "react-native-extra-dimensions-android";

const window = () =>
  Platform.OS === "ios"
    ? {
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height
      }
    : {
        width: ExtraDimensions.get("REAL_WINDOW_WIDTH"),
        height: ExtraDimensions.get("REAL_WINDOW_HEIGHT")
      };

export default {
  window,
  normalBlockHeight: 44,
  statusBarHeight: Constants.statusBarHeight
};
