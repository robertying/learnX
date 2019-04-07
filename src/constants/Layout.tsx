import Constants from "expo-constants";
import { Dimensions } from "react-native";

const width = Dimensions.get("window").width;
const height = Dimensions.get("window").height;

export default {
  isSmallDevice: width < 375,
  window: {
    height,
    width
  },
  normalBlockHeight: 44,
  statusBarHeight: Constants.statusBarHeight
};
