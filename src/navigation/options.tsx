import { Platform } from 'react-native';
import { useNavigation, ParamListBase, Theme } from '@react-navigation/native';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import { getTitleOptions } from 'components/HeaderTitle';
import IconButton from 'components/IconButton';
import Colors from 'constants/Colors';
import DeviceInfo from 'constants/DeviceInfo';

export const BackButton = () => {
  const navigation = useNavigation();

  return (
    <IconButton
      accessibilityLabel={t('close')}
      onPress={() => navigation.goBack()}
      icon="close"
    />
  );
};

export const getCloseHeaderItem = (
  navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'goBack'>,
): NativeStackHeaderItem => ({
  type: 'button',
  identifier: 'close',
  label: t('close'),
  icon: { type: 'sfSymbol', name: 'xmark' },
  onPress: () => navigation.goBack(),
});

/** Options for the first screen of a modal stack: a close button and a title. */
export const getModalScreenOptions =
  (title: string) =>
  ({
    navigation,
  }: {
    navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'goBack'>;
  }): NativeStackNavigationOptions => ({
    headerLeft: () => <BackButton />,
    unstable_headerLeftItems: () => [getCloseHeaderItem(navigation)],
    ...getTitleOptions(title),
  });

const supportsNativeSubtitle = DeviceInfo.supportsNativeSubtitle();

// Detail screens set their own title from the item they show.
export const getDetailScreenOptions = (title = '') =>
  function ({ theme }: { theme: Theme }): NativeStackNavigationOptions {
    return {
      ...getTitleOptions(title),
      headerTintColor: Platform.OS === 'ios' ? Colors.theme : undefined,
      // A native title would otherwise take the tint color.
      headerTitleStyle: supportsNativeSubtitle
        ? { color: theme.colors.text }
        : undefined,
    };
  };

// Dev-only screen for the mock accounts; not translated.
export const mockNetworkTitle = 'Network Emulation';
