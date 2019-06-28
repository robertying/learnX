import Info from "react-native-device-info";

const DeviceInfo = {
  isPad: Info.isTablet()
};

export default DeviceInfo;
