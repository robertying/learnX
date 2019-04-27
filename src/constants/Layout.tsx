import Constants from "expo-constants";
import { Dimensions, Platform } from "react-native";
import ExtraDimensions from "react-native-extra-dimensions-android";

const width = Dimensions.get("window").width;
const height =
  Platform.OS === "ios"
    ? Dimensions.get("window").height
    : ExtraDimensions.get("REAL_WINDOW_HEIGHT");

export default {
  isSmallDevice: width < 375,
  window: {
    height,
    width
  },
  normalBlockHeight: 44,
  statusBarHeight: Constants.statusBarHeight
};
