import { Fragment, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  SceneRendererProps,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import { Assignment, Course, File, Notice } from 'data/types/state';
import { useCourse } from 'data/queries';
import { useLoggedIn } from 'data/auth';
import { useUserData, type BookmarkType } from 'data/userData';
import { toggleArchived, toggleFavorite } from 'services/listActions';
import {
  useAssignments,
  useFiles,
  useNotices,
  useRefreshCourseAssignments,
  useRefreshCourseFiles,
  useRefreshCourseNotices,
} from 'data/content';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import FlatList from 'components/FlatList';
import ListBackground from 'components/ListBackground';
import { Paragraph } from 'components/Text';
import {
  groupCourseFiles,
  type FileCategoryHeading,
} from 'helpers/groupCourseFiles';
import { t } from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { SplitViewContext } from 'navigation/SplitView';
import Spacing from 'constants/Spacing';
import Styles from 'constants/Styles';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  CourseDetailParamList,
  MainStackNavigationProp,
  MainStackScreenProps,
} from 'navigation/types';
import useHeaderButtons from 'hooks/useHeaderButtons';
import useInert from 'hooks/useInert';
import useRefreshCommand from 'hooks/useRefreshCommand';
import SegmentedTabs from 'components/SegmentedTabs';
import { SafeAreaView } from 'react-native-screens/experimental';
import { hasGlassHeader } from 'navigation/options';
import { isApple } from 'helpers/platform';
import { scrollInsetBehavior } from 'constants/scrollInsetBehavior';
import { useWindowTitle } from 'hooks/useWindow';

type NavigationProp = MainStackNavigationProp<
  CourseDetailParamList,
  'CourseDetail'
>;

interface CourseItemListProps<T extends Notice | Assignment | File> {
  data: (T | FileCategoryHeading)[];
  header?: React.ReactElement;
  card: React.FC<{
    data: T;
    fav?: boolean;
    onToggleFav?: () => void;
    archived?: boolean;
    onToggleArchived?: () => void;
    hideCourseName?: boolean;
    markArchived?: boolean;
    onPress?: () => void;
    last?: boolean;
  }>;
  detailScreen: 'NoticeDetail' | 'AssignmentDetail' | 'FileDetail';
  /** What the list holds, for its empty state and the cards' actions. */
  type: BookmarkType;
  /** The course's refresh of this list (`useRefreshCourseNotices`, …). */
  refresh: { isPending: boolean; mutate: () => void };
  /** The height of the tabs floating over the top of the list. */
  topInset: number;
}

/** One of the course's notices, assignments and files tabs. */
const CourseItemList = <T extends Notice | Assignment | File>({
  data,
  header,
  card: Card,
  detailScreen,
  type,
  refresh,
  topInset,
}: CourseItemListProps<T>) => {
  const navigation = useNavigation<NavigationProp>();
  const loggedIn = useLoggedIn();
  // Every item of the course, archived ones too, which their cards show as
  // such (Unarchive in their actions).
  const archivedIds = useUserData(userData => userData.archived[type]);
  const archivedSet = new Set(archivedIds);

  const handleRefresh = () => {
    if (loggedIn) {
      refresh.mutate();
    }
  };

  return (
    <View style={Styles.flex1}>
      {data.length ? null : (
        <ListBackground>
          <Empty type={type} />
        </ListBackground>
      )}
      <FlatList
        data={data}
        ListHeaderComponent={header}
        getItemType={item => ('heading' in item ? 'heading' : type)}
        renderItem={({ item, index }) => {
          if ('heading' in item) {
            return (
              <Paragraph
                accessibilityRole="header"
                variant="label"
                style={styles.categoryHeading}
              >
                {item.heading}
              </Paragraph>
            );
          }
          const next = data[index + 1];
          return (
            <Card
              data={item}
              last={!next || 'heading' in next}
              fav={!!item.isFavorite}
              onToggleFav={() =>
                toggleFavorite(type, item.id, !!item.isFavorite)
              }
              archived={archivedSet.has(item.id)}
              onToggleArchived={() =>
                toggleArchived(type, [item.id], archivedSet.has(item.id))
              }
              hideCourseName
              markArchived
              onPress={() => navigation.push(detailScreen, { id: item.id })}
            />
          );
        }}
        keyExtractor={item =>
          'heading' in item ? item.key : `item:${item.id}`
        }
        refreshing={refresh.isPending}
        onRefresh={handleRefresh}
        contentInsetAdjustmentBehavior={scrollInsetBehavior}
        contentInset={{ top: topInset }}
        // Starts at the top of its inset. React Native reuses scroll views,
        // and one that showed a list before keeps the offset it was given
        // (none: zero), which UIKit then moves by the header's height only,
        // so a list opened after a tab switch sat under the tabs.
        contentOffset={{ x: 0, y: -topInset }}
        scrollIndicatorInsets={{ top: topInset }}
      />
    </View>
  );
};

const routes = [
  { key: 'notice', title: t('notices') },
  { key: 'assignment', title: t('assignments') },
  { key: 'file', title: t('files') },
];

type Props = MainStackScreenProps<CourseDetailParamList, 'CourseDetail'>;

const CourseDetail: React.FC<Props> = ({ navigation, route }) => {
  const course = useCourse(route.params.id);

  useHeaderTitle(navigation, course?.name, course?.teacherName);
  useWindowTitle(course?.name);

  if (!course) {
    return <NotFound />;
  }

  return <CourseDetailContent course={course} navigation={navigation} />;
};

const CourseDetailContent: React.FC<{
  course: Course;
  navigation: Props['navigation'];
}> = ({ course, navigation }) => {
  const detailNavigator = useDetailNavigator();
  const { masterWidth } = useContext(SplitViewContext);
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  // The width the tabs start with, before they're laid out. iOS gives each
  // split column its own frame, with the columns beside it as insets;
  // Android's split is drawn in JS, in the window's frame.
  const initialWidth =
    frame.width -
    insets.left -
    insets.right -
    (!isApple() && detailNavigator ? masterWidth + 1 : 0);

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();
  const refreshNotices = useRefreshCourseNotices(course.id);
  const refreshAssignments = useRefreshCourseAssignments(course.id);
  const refreshFiles = useRefreshCourseFiles(course.id);

  const [index, setIndex] = useState(0);
  const [filesByCategory, setFilesByCategory] = useState(false);
  // The floating tabs' height, which the lists scroll clear of.
  const [tabsHeight, setTabsHeight] = useState(0);

  const renderTabBar = ({
    navigationState,
    jumpTo,
  }: SceneRendererProps & {
    navigationState: NavigationState<{
      key: string;
      title: string;
    }>;
  }) => (
    <SegmentedTabs
      titles={navigationState.routes.map(r => r.title)}
      selectedIndex={navigationState.index}
      onSelect={i => jumpTo(navigationState.routes[i].key)}
    />
  );

  const renderScene = ({
    route: sceneRoute,
  }: {
    route: {
      key: string;
    };
  }) => (
    <CoursePage selected={sceneRoute.key === routes[index].key}>
      {renderList(sceneRoute.key)}
    </CoursePage>
  );

  const renderList = (key: string) => {
    switch (key) {
      case 'notice':
        return (
          <CourseItemList
            data={notices.filter(i => i.courseId === course.id)}
            card={NoticeCard}
            detailScreen="NoticeDetail"
            type="notice"
            refresh={refreshNotices}
            topInset={tabsHeight}
          />
        );
      case 'assignment':
        return (
          <CourseItemList
            data={assignments.filter(i => i.courseId === course.id)}
            card={AssignmentCard}
            detailScreen="AssignmentDetail"
            type="assignment"
            refresh={refreshAssignments}
            topInset={tabsHeight}
          />
        );
      case 'file': {
        const courseFiles = files.filter(file => file.courseId === course.id);
        return (
          <CourseItemList
            data={
              filesByCategory
                ? groupCourseFiles(courseFiles, t('uncategorized'))
                : courseFiles
            }
            header={
              courseFiles.length ? (
                <SegmentedTabs
                  accessibilityLabel={t('courseFileView')}
                  titles={[t('filesByTime'), t('filesByCategory')]}
                  selectedIndex={filesByCategory ? 1 : 0}
                  onSelect={i => setFilesByCategory(i === 1)}
                />
              ) : undefined
            }
            card={FileCard}
            detailScreen="FileDetail"
            type="file"
            refresh={refreshFiles}
            topInset={tabsHeight}
          />
        );
      }
      default:
        return null;
    }
  };

  const handleNavigateCourseX = () => {
    if (detailNavigator) {
      detailNavigator.push('CourseX', { id: course.id });
    } else {
      navigation.navigate('CourseXStack', {
        screen: 'CourseX',
        params: {
          id: course.id,
        },
      });
    }
  };

  // The selected tab's refresh, where there's no pull to refresh (Mac) or
  // from the menu bar.
  const loggedIn = useLoggedIn();
  const selectedRefresh = [refreshNotices, refreshAssignments, refreshFiles][
    index
  ];
  const refreshButton = useRefreshCommand({
    refreshing: selectedRefresh.isPending,
    onRefresh: () => loggedIn && selectedRefresh.mutate(),
  });

  // The course's page on CourseX, from the header like an item's info.
  useHeaderButtons(navigation, 'right', [
    refreshButton,
    {
      id: 'courseInformation',
      label: t('courseInformation'),
      icon: 'info',
      onPress: handleNavigateCourseX,
    },
  ]);

  // From iOS 26 the tabs float under the header as a glass capsule over the
  // selected list, which scrolls under both. It has to be the screen's first
  // view for the header to blur what scrolls under it, which a pager's own
  // scroll view would be, so the lists don't swipe there (as with the system
  // segmented controls).
  if (hasGlassHeader) {
    return (
      <SafeArea testID="course-detail" collapsable={false}>
        {/* Once the tabs are laid out: a list starts at its top inset only
            when it has it from the start, so it starts over when the tabs'
            height changes (the SwiftUI control sizes itself after the first
            layout), or it would open scrolled down under them. */}
        {tabsHeight ? (
          <Fragment key={`${routes[index].key}-${tabsHeight}`}>
            {renderScene({ route: routes[index] })}
          </Fragment>
        ) : null}
        <SafeAreaView
          edges={{ top: true }}
          style={styles.floatingTabs}
          pointerEvents="box-none"
        >
          <View onLayout={e => setTabsHeight(e.nativeEvent.layout.height)}>
            <SegmentedTabs
              titles={routes.map(r => r.title)}
              selectedIndex={index}
              onSelect={setIndex}
              floating
            />
          </View>
        </SafeAreaView>
      </SafeArea>
    );
  }

  return (
    <SafeArea testID="course-detail" collapsable={false}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        // The cards swipe for their actions, so the pages change only from
        // the tabs, as with the floating tabs from iOS 26.
        swipeEnabled={false}
        tabBarPosition="top"
        initialLayout={{ width: initialWidth }}
      />
    </SafeArea>
  );
};

/**
 * One of the pager's pages, which all stay mounted side by side: the ones
 * not selected are inert in the Electron app, so Tab doesn't go through
 * their cards and scroll the pager to them under the selected tab.
 */
const CoursePage: React.FC<React.PropsWithChildren<{ selected: boolean }>> = ({
  selected,
  children,
}) => {
  const page = useInert(!selected);
  return (
    <View ref={page} style={Styles.flex1}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryHeading: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.xs,
  },
  floatingTabs: {
    position: 'absolute',
    // Its own height, not the screen's (SafeAreaView flexes by default).
    flex: 0,
    top: 0,
    left: 0,
    right: 0,
  },
});

export default CourseDetail;
