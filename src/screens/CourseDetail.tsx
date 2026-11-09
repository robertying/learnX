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
import { SplitViewContext } from 'components/SplitView';
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

const Notices = ({ courseId, data }: { courseId: string; data: Notice[] }) => {
  const navigation = useNavigation<NavigationProp>();

  const loggedIn = useLoggedIn();
  const refresh = useRefreshCourseNotices(courseId);
  const fetching = refresh.isPending;

  const handleRefresh = () => {
    if (loggedIn) {
      refresh.mutate();
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <NoticeCard
          data={item}
          disableSwipe
          hideCourseName
          onPress={() => navigation.push('NoticeDetail', { id: item.id })}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
      contentContainerStyle={[
        { flexGrow: 1 },
        data.length ? null : { justifyContent: 'center' },
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
};

const Assignments = ({
  courseId,
  data,
}: {
  courseId: string;
  data: Assignment[];
}) => {
  const navigation = useNavigation<NavigationProp>();

  const loggedIn = useLoggedIn();
  const refresh = useRefreshCourseAssignments(courseId);
  const fetching = refresh.isPending;

  const handleRefresh = () => {
    if (loggedIn) {
      refresh.mutate();
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <AssignmentCard
          data={item}
          disableSwipe
          hideCourseName
          onPress={() => navigation.push('AssignmentDetail', { id: item.id })}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
      contentContainerStyle={[
        { flexGrow: 1 },
        data.length ? null : { justifyContent: 'center' },
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
};

const Files = ({ courseId, data }: { courseId: string; data: File[] }) => {
  const navigation = useNavigation<NavigationProp>();

  const loggedIn = useLoggedIn();
  const refresh = useRefreshCourseFiles(courseId);
  const fetching = refresh.isPending;

  const handleRefresh = () => {
    if (loggedIn) {
      refresh.mutate();
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <FileCard
          data={item}
          disableSwipe
          hideCourseName
          onPress={() => navigation.push('FileDetail', { id: item.id })}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
      contentContainerStyle={[
        { flexGrow: 1 },
        data.length ? null : { justifyContent: 'center' },
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
          <Notices
            courseId={course.id}
            data={notices.filter(i => i.courseId === course.id)}
          />
        );
      case 'assignment':
        return (
          <Assignments
            courseId={course.id}
            data={assignments.filter(i => i.courseId === course.id)}
          />
        );
      case 'file':
        return (
          <Files
            courseId={course.id}
            data={files.filter(i => i.courseId === course.id)}
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
