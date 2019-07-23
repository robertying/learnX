import { Platform } from "react-native";
import Info from "react-native-device-info";

const DeviceInfo = {
  isIPad: Info.isTablet() && Platform.OS === "ios"
};

export default DeviceInfo;
