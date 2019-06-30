import { Navigation } from "react-native-navigation";

export const isTesting = async () => {
  const launchArgs = await Navigation.getLaunchArgs();
  return launchArgs.includes("-detoxServer");
};
