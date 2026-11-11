import { Platform } from 'react-native';
import {
  useNavigation,
  ParamListBase,
  RouteProp,
  Theme,
} from '@react-navigation/native';
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
import { getAssignment, getFile, getNotice } from 'data/content';
import { getCachedCourses } from 'data/queries';
import type { ItemDetailParams } from 'screens/types';

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

/**
 * A tab's first screen: a large title that collapses as the list scrolls, on
 * iPhone and iPad with iOS 26 and later, where the subtitle (the filter, the
 * date) shows under it natively. Before iOS 26 the subtitle is our own view,
 * which a large title would hide, and Mac apps don't use large titles.
 */
export const tabRootOptions: NativeStackNavigationOptions =
  supportsNativeSubtitle && !DeviceInfo.isMac()
    ? { headerLargeTitleEnabled: true }
    : {};

/**
 * Every stack's screens: from iOS 26 the back button is the chevron alone,
 * as in Settings and Files. A back button with the previous screen's title
 * fades out and in again once a push has finished (iOS rebuilds it), which
 * the chevron alone doesn't. The Mac keeps the title.
 */
export const stackScreenOptions: NativeStackNavigationOptions =
  DeviceInfo.hasLiquidGlass() && !DeviceInfo.isMac()
    ? { headerBackButtonDisplayMode: 'minimal' }
    : {};

// Detail screens set their own title from the item they show.
export const getDetailScreenOptions = (title = '', subtitle?: string) =>
  function ({ theme }: { theme: Theme }): NativeStackNavigationOptions {
    return {
      ...getTitleOptions(title, subtitle),
      headerTintColor: Platform.OS === 'ios' ? Colors.theme : undefined,
      // A native title would otherwise take the tint color.
      headerTitleStyle: supportsNativeSubtitle
        ? { color: theme.colors.text }
        : undefined,
    };
  };

/**
 * The title and subtitle an item detail screen shows (`useHeaderTitle`), from
 * the cached item.
 */
export const getItemTitle = ({
  name,
  params,
}: RouteProp<ItemDetailParams>): [string?, string?] => {
  // A notice's or assignment's attachment, known only from the params
  if ('attachment' in params) {
    return [params.attachment.title, params.attachment.courseName];
  }
  if (name === 'CourseDetail') {
    const course = getCachedCourses().find(c => c.id === params.id);
    return [course?.name, course?.teacherName];
  }
  if (name === 'FileDetail') {
    const file = getFile(params.id);
    return [file?.title, file?.courseName];
  }
  const item = (name === 'NoticeDetail' ? getNotice : getAssignment)(params.id);
  return [item?.courseName, item?.courseTeacherName];
};

/**
 * An item detail screen's options, with its title from the start: a title
 * that changes once the screen has been pushed redraws the back button, which
 * then flashes.
 */
export const getItemDetailOptions = ({
  theme,
  route,
}: {
  theme: Theme;
  route: RouteProp<ItemDetailParams>;
}) => getDetailScreenOptions(...getItemTitle(route))({ theme });

// Dev-only screen for the mock account; not translated.
export const mockNetworkTitle = 'Network Emulation';
