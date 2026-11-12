import { Platform } from 'react-native';
import { ParamListBase, RouteProp, Theme } from '@react-navigation/native';
import type {
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { t } from 'helpers/i18n';
import HeaderTitle from 'components/HeaderTitle';
import { brandColor } from 'theme';
import DeviceInfo from 'constants/DeviceInfo';
import { getAssignment, getFile, getNotice } from 'data/content';
import { getCachedCourses } from 'data/queries';
import { headerButtons } from './headerButtons';
import type { ItemDetailParams } from './types';

// From iOS 26 the header shows a subtitle itself.
const supportsNativeSubtitle = DeviceInfo.hasLiquidGlass();

/**
 * A screen's title and subtitle: in the header itself from iOS 26, and in
 * our own HeaderTitle before that and on Android.
 */
export const getTitleOptions = (title: string, subtitle?: string) =>
  supportsNativeSubtitle
    ? { title, headerSubtitle: subtitle }
    : {
        title,
        headerTitle: () => <HeaderTitle title={title} subtitle={subtitle} />,
      };

/** Options for the first screen of a modal stack: a close button and a title. */
export const getModalScreenOptions =
  (title: string) =>
  ({
    navigation,
  }: {
    navigation: Pick<NativeStackNavigationProp<ParamListBase>, 'goBack'>;
  }): NativeStackNavigationOptions => ({
    ...headerButtons('left', [
      {
        id: 'close',
        label: t('close'),
        icon: 'close',
        onPress: () => navigation.goBack(),
      },
    ]),
    ...getTitleOptions(title),
  });

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

/** iPhone and iPad from iOS 26, where the header is Liquid Glass; the Mac keeps its own. */
export const hasGlassHeader =
  DeviceInfo.hasLiquidGlass() && !DeviceInfo.isMac();

/**
 * Every stack's screens, from iOS 26 on iPhone and iPad:
 * - The header is transparent, so every screen is laid out under it and its
 *   content scrolls under the glass, as in the system apps. A scroll view
 *   keeps clear of the header by itself (`contentInsetAdjustmentBehavior`
 *   "automatic": our `FlatList` and `ScrollView`, `Form`, the web views and
 *   the PDF view). An opaque header would instead have react-native-screens
 *   push the content below it, onto a plain bar. Content over the top of a
 *   screen keeps clear of the header with react-native-screens'
 *   `SafeAreaView` and its top edge (`PageProgressBar`, Course detail's
 *   floating tabs). The header blurs what scrolls under it only for the
 *   screen's first scroll view (UIKit's content scroll view), so a pager's
 *   own scroll view would hide it.
 * - The back button is the chevron alone, as SwiftUI, Settings and Files show
 *   it (the long-press menu still lists the titles). UIKit shows the previous
 *   screen's title only when asked, and on iOS 27 that titled button fades
 *   out and in after a push in which header buttons morph (a right button on
 *   both screens, or a list's left buttons turning into the back button),
 *   also in plain UIKit.
 * The Mac keeps its own header and the titled back button. Don't set
 * `headerTransparent` per screen: this is the one place for it.
 */
export const stackScreenOptions: NativeStackNavigationOptions = hasGlassHeader
  ? { headerTransparent: true, headerBackButtonDisplayMode: 'minimal' }
  : {};

// Detail screens set their own title from the item they show.
export const getDetailScreenOptions = (title = '', subtitle?: string) =>
  function ({ theme }: { theme: Theme }): NativeStackNavigationOptions {
    return {
      ...getTitleOptions(title, subtitle),
      headerTintColor: Platform.OS === 'ios' ? brandColor : undefined,
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

// The debug build's tools (`screens/Debug`); not translated.
export const debugTitle = 'Debug';
