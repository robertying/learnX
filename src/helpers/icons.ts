import Icon from 'react-native-vector-icons/MaterialIcons';

interface ITabIcons {
  readonly notifications: number;
  readonly folder: number;
  readonly today: number;
  readonly apps: number;
  readonly settings: number;
  readonly close: number;
  readonly search: number;
}

const size = 25;

// tslint:disable-next-line: no-let
let icons: ITabIcons;

export const loadTabIcons = async () => {
  if (icons) {
    return icons;
  }

  const imageSources = await Promise.all([
    Icon.getImageSource('notifications', size),
    Icon.getImageSource('folder', size),
    Icon.getImageSource('today', size),
    Icon.getImageSource('apps', size),
    Icon.getImageSource('settings', size),
    Icon.getImageSource('close', size),
    Icon.getImageSource('search', size),
  ]);

  icons = {
    notifications: imageSources[0],
    folder: imageSources[1],
    today: imageSources[2],
    apps: imageSources[3],
    settings: imageSources[4],
    close: imageSources[5],
    search: imageSources[6],
  };

  return icons;
};
