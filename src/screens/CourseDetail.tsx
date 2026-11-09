import { useContext, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  SceneRendererProps,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import Icon from '@react-native-vector-icons/material-design-icons';
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
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import FlatList from 'components/FlatList';
import { t } from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import { SplitViewContext } from 'navigation/SplitView';
import DeviceInfo from 'constants/DeviceInfo';
import NotFound from 'components/NotFound';
import useHeaderTitle from 'hooks/useHeaderTitle';
import {
  CourseDetailParamList,
  MainStackNavigationProp,
  MainStackScreenProps,
} from './types';
import { Text } from 'components/Text';
import Divider from 'components/Divider';
import SegmentedTabs from 'components/SegmentedTabs';
import { useTheme } from 'theme';

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
    disableSwipe?: boolean;
    hideCourseName?: boolean;
    onPress?: () => void;
  }>;
  detailScreen: 'NoticeDetail' | 'AssignmentDetail' | 'FileDetail';
  /** The course's refresh of this list (`useRefreshCourseNotices`, …). */
  refresh: { isPending: boolean; mutate: () => void };
}

/** One of the course's notices, assignments and files tabs. */
const CourseItemList = <T extends Notice | Assignment | File>({
  data,
  card: Card,
  detailScreen,
  refresh,
}: CourseItemListProps<T>) => {
  const navigation = useNavigation<NavigationProp>();
  const loggedIn = useLoggedIn();

  const handleRefresh = () => {
    if (loggedIn) {
      refresh.mutate();
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <Card
          data={item}
          disableSwipe
          hideCourseName
          onPress={() => navigation.push(detailScreen, { id: item.id })}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={refresh.isPending}
      onRefresh={handleRefresh}
      contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
      contentContainerStyle={[
        styles.listContent,
        data.length ? null : styles.emptyListContent,
      ]}
      ListEmptyComponent={<Empty />}
    />
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
  const theme = useTheme();

  const detailNavigator = useDetailNavigator();
  const { masterWidth } = useContext(SplitViewContext);

  const { notices } = useNotices();
  const { assignments } = useAssignments();
  const { files } = useFiles();
  const refreshNotices = useRefreshCourseNotices(course.id);
  const refreshAssignments = useRefreshCourseAssignments(course.id);
  const refreshFiles = useRefreshCourseFiles(course.id);

  const [index, setIndex] = useState(0);

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
            refresh={refreshNotices}
          />
        );
      case 'assignment':
        return (
          <CourseItemList
            data={assignments.filter(i => i.courseId === course.id)}
            card={AssignmentCard}
            detailScreen="AssignmentDetail"
            refresh={refreshAssignments}
          />
        );
      case 'file':
        return (
          <CourseItemList
            data={files.filter(i => i.courseId === course.id)}
            card={FileCard}
            detailScreen="FileDetail"
            refresh={refreshFiles}
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

  return (
    <SafeArea>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[
          styles.courseXContainer,
          { backgroundColor: theme.colors.surface },
        ]}
        onPress={handleNavigateCourseX}
        accessibilityRole="button"
      >
        <Icon
          style={styles.icon}
          color={theme.colors.onSurface}
          name="information-outline"
          size={20}
        />
        <Text>{t('courseInformation')}</Text>
      </TouchableOpacity>
      <Divider />
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        tabBarPosition="top"
        initialLayout={{
          width: detailNavigator
            ? Dimensions.get('window').width -
              masterWidth -
              1 /* divider width */
            : Dimensions.get('window').width,
        }}
      />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  courseXContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginHorizontal: 4,
  },
});

export default CourseDetail;
