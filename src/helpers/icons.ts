import Icon from "react-native-vector-icons/MaterialIcons";

interface ITabIcons {
  readonly notifications: number;
  readonly folder: number;
  readonly today: number;
  readonly apps: number;
}

export const loadTabIcons = async () => {
  const imageSources = await Promise.all([
    Icon.getImageSource("notifications", 24),
    Icon.getImageSource("folder", 24),
    Icon.getImageSource("today", 24),
    Icon.getImageSource("apps", 24)
  ]);

  const icons: ITabIcons = {
    notifications: imageSources[0],
    folder: imageSources[1],
    today: imageSources[2],
    apps: imageSources[3]
  };

  return icons;
};
