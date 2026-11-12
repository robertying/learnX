import {
  Fragment,
  useContext,
  useEffectEvent,
  useLayoutEffect,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
import Empty, { type EmptyType } from 'components/Empty';
import SafeArea from 'components/SafeArea';
import FlatList from 'components/FlatList';
import ListBackground from 'components/ListBackground';
import { t } from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { SplitViewContext } from 'navigation/SplitView';
import DeviceInfo from 'constants/DeviceInfo';
import Styles from 'constants/Styles';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  CourseDetailParamList,
  MainStackNavigationProp,
  MainStackScreenProps,
} from 'navigation/types';
import { headerButtons } from 'navigation/headerButtons';
import SegmentedTabs from 'components/SegmentedTabs';
import { SafeAreaView } from 'react-native-screens/experimental';
import { hasGlassHeader } from 'navigation/options';

const listContentInsetAdjustmentBehavior = DeviceInfo.isMac()
  ? ('never' as const)
  : ('automatic' as const);

type NavigationProp = MainStackNavigationProp<
  CourseDetailParamList,
  'CourseDetail'
>;

interface CourseItemListProps<T extends Notice | Assignment | File> {
  data: T[];
  card: React.FC<{
    data: T;
    actionsDisabled?: boolean;
    hideCourseName?: boolean;
    onPress?: () => void;
    last?: boolean;
  }>;
  detailScreen: 'NoticeDetail' | 'AssignmentDetail' | 'FileDetail';
  /** What the list holds, for its empty state. */
  type: EmptyType;
  /** The course's refresh of this list (`useRefreshCourseNotices`, …). */
  refresh: { isPending: boolean; mutate: () => void };
  /** The height of the tabs floating over the top of the list. */
  topInset: number;
}

/** One of the course's notices, assignments and files tabs. */
const CourseItemList = <T extends Notice | Assignment | File>({
  data,
  card: Card,
  detailScreen,
  type,
  refresh,
  topInset,
}: CourseItemListProps<T>) => {
  const navigation = useNavigation<NavigationProp>();
  const loggedIn = useLoggedIn();

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
        renderItem={({ item, index }) => (
          <Card
            data={item}
            last={index === data.length - 1}
            actionsDisabled
            hideCourseName
            onPress={() => navigation.push(detailScreen, { id: item.id })}
          />
        )}
        keyExtractor={item => item.id}
        refreshing={refresh.isPending}
        onRefresh={handleRefresh}
        contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
        contentInset={{ top: topInset }}
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
    (Platform.OS === 'android' && detailNavigator ? masterWidth + 1 : 0);

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();
  const refreshNotices = useRefreshCourseNotices(course.id);
  const refreshAssignments = useRefreshCourseAssignments(course.id);
  const refreshFiles = useRefreshCourseFiles(course.id);

  const [index, setIndex] = useState(0);
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
  }) => {
    switch (sceneRoute.key) {
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
      case 'file':
        return (
          <CourseItemList
            data={files.filter(i => i.courseId === course.id)}
            card={FileCard}
            detailScreen="FileDetail"
            type="file"
            refresh={refreshFiles}
            topInset={tabsHeight}
          />
        );
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
  const openCourseX = useEffectEvent(handleNavigateCourseX);

  // The course's page on CourseX, from the header like an item's info.
  useLayoutEffect(() => {
    navigation.setOptions(
      headerButtons('right', [
        {
          id: 'courseInformation',
          label: t('courseInformation'),
          icon: 'info',
          onPress: () => openCourseX(),
        },
      ]),
    );
  }, [navigation]);

  // From iOS 26 the tabs float under the header as a glass capsule over the
  // selected list, which scrolls under both. It has to be the screen's first
  // view for the header to blur what scrolls under it, which a pager's own
  // scroll view would be, so the lists don't swipe there (as with the system
  // segmented controls).
  if (hasGlassHeader) {
    return (
      <SafeArea testID="course-detail" collapsable={false}>
        {/* Once the tabs are laid out: a list starts at its top inset only
            when it has it from the start. */}
        {tabsHeight ? (
          <Fragment key={routes[index].key}>
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
        tabBarPosition="top"
        initialLayout={{ width: initialWidth }}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
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
