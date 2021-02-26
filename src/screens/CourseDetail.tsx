import React, {useLayoutEffect} from 'react';
import {Dimensions, FlatList} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import {StackNavigationProp, StackScreenProps} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import {Scene} from 'react-native-tab-view/lib/typescript/src/types';
import {Assignment, File, Notice} from 'data/types/state';
import {useTypedSelector} from 'data/store';
import {getNoticesForCourse} from 'data/actions/notices';
import {getAssignmentsForCourse} from 'data/actions/assignments';
import {getFilesForCourse} from 'data/actions/files';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';

const Notices = ({courseId, data}: {courseId: string; data: Notice[]}) => {
  const navigation = useNavigation<StackNavigationProp<ScreenParams>>();

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);
  const fetching = useTypedSelector((state) => state.notices.fetching);

  const handleRefresh = () => {
    if (loggedIn) {
      dispatch(getNoticesForCourse(courseId));
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({item}) => (
        <NoticeCard
          data={item}
          dragEnabled={false}
          hideCourseName
          onPress={() => navigation.push('NoticeDetail', item)}
        />
      )}
      keyExtractor={(item) => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentContainerStyle={[
        {flexGrow: 1},
        data.length ? null : {justifyContent: 'center'},
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
  const navigation = useNavigation<StackNavigationProp<ScreenParams>>();

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);
  const fetching = useTypedSelector((state) => state.assignments.fetching);

  const handleRefresh = () => {
    if (loggedIn) {
      dispatch(getAssignmentsForCourse(courseId));
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({item}) => (
        <AssignmentCard
          data={item}
          dragEnabled={false}
          hideCourseName
          onPress={() => navigation.push('AssignmentDetail', item)}
        />
      )}
      keyExtractor={(item) => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentContainerStyle={[
        {flexGrow: 1},
        data.length ? null : {justifyContent: 'center'},
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
};

const Files = ({courseId, data}: {courseId: string; data: File[]}) => {
  const navigation = useNavigation<StackNavigationProp<ScreenParams>>();

  const dispatch = useDispatch();
  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);
  const fetching = useTypedSelector((state) => state.files.fetching);

  const handleRefresh = () => {
    if (loggedIn) {
      dispatch(getFilesForCourse(courseId));
    }
  };

  return (
    <FlatList
      data={data}
      renderItem={({item}) => (
        <FileCard
          data={item}
          dragEnabled={false}
          hideCourseName
          onPress={() => navigation.push('FileDetail', item)}
        />
      )}
      keyExtractor={(item) => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentContainerStyle={[
        {flexGrow: 1},
        data.length ? null : {justifyContent: 'center'},
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
};

const CourseDetail: React.FC<
  StackScreenProps<ScreenParams, 'CourseDetail'>
> = ({
  navigation,
  route: {
    params: {disableAnimation, ...course},
  },
}) => {
  const theme = useTheme();

  const notices = useTypedSelector((state) => state.notices.items);
  const assignments = useTypedSelector((state) => state.assignments.items);
  const files = useTypedSelector((state) => state.files.items);

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {key: 'notice', title: '通知'},
    {key: 'assignment', title: '作业'},
    {key: 'file', title: '文件'},
  ]);

  const renderLabel = ({
    route,
  }: Scene<Route> & {
    focused: boolean;
    color: string;
  }) => <Text>{route.title}</Text>;

  const renderTabBar = (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => (
    <TabBar
      style={{backgroundColor: theme.colors.surface}}
      indicatorStyle={{
        backgroundColor: theme.colors.primary,
      }}
      {...props}
      renderLabel={renderLabel}
    />
  );

  const renderScene = ({
    route,
  }: {
    route: {
      key: string;
    };
  }) => {
    switch (route.key) {
      case 'notice':
        return (
          <Notices
            courseId={course.id}
            data={notices.filter((i) => i.courseId === course.id)}
          />
        );
      case 'assignment':
        return (
          <Assignments
            courseId={course.id}
            data={assignments.filter((i) => i.courseId === course.id)}
          />
        );
      case 'file':
        return (
          <Files
            courseId={course.id}
            data={files.filter((i) => i.courseId === course.id)}
          />
        );
      default:
        return null;
    }
  };

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animationEnabled: false,
      });
    }
  }, [navigation, disableAnimation]);

  return (
    <SafeArea>
      <TabView
        navigationState={{index, routes}}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{width: Dimensions.get('window').width}}
      />
    </SafeArea>
  );
};

export default CourseDetail;
