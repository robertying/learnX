import Constants from "expo-constants";
import { Dimensions } from "react-native";

export default {
  window: Dimensions.get("window"),
  normalBlockHeight: 44,
  statusBarHeight: Constants.statusBarHeight
};
