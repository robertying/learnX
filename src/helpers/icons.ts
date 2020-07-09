import Icon from 'react-native-vector-icons/MaterialIcons';

const iconNames = [
  'notifications',
  'folder',
  'event',
  'apps',
  'settings',
] as const;
type IIcon = typeof iconNames[number];
export type IIcons = Record<IIcon, number>;

let _icons: IIcons;

const size = 25;

export const loadIcons = async () => {
  if (_icons) {
    return _icons;
  }

  const imageSources = await Promise.all<number>(
    iconNames.map((name) => Icon.getImageSource(name, size)),
  );

  _icons = imageSources.reduce<IIcons>(
    (prev, current, index) => ({...prev, [iconNames[index]]: current}),
    {} as any,
  );

  return _icons;
};
