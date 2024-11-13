import {memo, useCallback, useLayoutEffect, useState} from 'react';
import {Dimensions, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {Divider, Text, useTheme} from 'react-native-paper';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {StackActions, useNavigation} from '@react-navigation/native';
import {
  Route,
  SceneRendererProps,
  TabBar,
  TabView,
  NavigationState,
  TabDescriptor,
  TabBarItem,
} from 'react-native-tab-view';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Assignment, File, Notice} from 'data/types/state';
import {useAppDispatch, useAppSelector} from 'data/store';
import {getNoticesForCourse} from 'data/actions/notices';
import {getAssignmentsForCourse} from 'data/actions/assignments';
import {getFilesForCourse} from 'data/actions/files';
import NoticeCard from 'components/NoticeCard';
import AssignmentCard from 'components/AssignmentCard';
import FileCard from 'components/FileCard';
import Empty from 'components/Empty';
import SafeArea from 'components/SafeArea';
import {t} from 'helpers/i18n';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {ScreenParams} from './types';

const Notices = memo(({courseId, data}: {courseId: string; data: Notice[]}) => {
  const navigation = useNavigation<NativeStackNavigationProp<ScreenParams>>();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const fetching = useAppSelector(state => state.notices.fetching);

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
          disableSwipe
          hideCourseName
          onPress={() => navigation.push('NoticeDetail', item)}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentContainerStyle={[
        {flexGrow: 1},
        data.length ? null : {justifyContent: 'center'},
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
});

const Assignments = memo(
  ({courseId, data}: {courseId: string; data: Assignment[]}) => {
    const navigation = useNavigation<NativeStackNavigationProp<ScreenParams>>();

    const dispatch = useAppDispatch();
    const loggedIn = useAppSelector(state => state.auth.loggedIn);
    const fetching = useAppSelector(state => state.assignments.fetching);

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
            disableSwipe
            hideCourseName
            onPress={() => navigation.push('AssignmentDetail', item)}
          />
        )}
        keyExtractor={item => item.id}
        refreshing={fetching}
        onRefresh={handleRefresh}
        contentContainerStyle={[
          {flexGrow: 1},
          data.length ? null : {justifyContent: 'center'},
        ]}
        ListEmptyComponent={<Empty />}
      />
    );
  },
);

const Files = memo(({courseId, data}: {courseId: string; data: File[]}) => {
  const navigation = useNavigation<NativeStackNavigationProp<ScreenParams>>();

  const dispatch = useAppDispatch();
  const loggedIn = useAppSelector(state => state.auth.loggedIn);
  const fetching = useAppSelector(state => state.files.fetching);

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
          disableSwipe
          hideCourseName
          onPress={() => navigation.push('FileDetail', item)}
        />
      )}
      keyExtractor={item => item.id}
      refreshing={fetching}
      onRefresh={handleRefresh}
      contentContainerStyle={[
        {flexGrow: 1},
        data.length ? null : {justifyContent: 'center'},
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
});

const routes = [
  {key: 'notice', title: t('notices')},
  {key: 'assignment', title: t('assignments')},
  {key: 'file', title: t('files')},
];

const CourseDetail: React.FC<
  React.PropsWithChildren<NativeStackScreenProps<ScreenParams, 'CourseDetail'>>
> = ({
  navigation,
  route: {
    params: {disableAnimation, ...course},
  },
}) => {
  const theme = useTheme();

  const detailNavigator = useDetailNavigator();

  const notices = useAppSelector(state => state.notices.items);
  const assignments = useAppSelector(state => state.assignments.items);
  const files = useAppSelector(state => state.files.items);

  const [index, setIndex] = useState(0);

  const renderTabBar = (
    props: SceneRendererProps & {
      navigationState: NavigationState<{
        key: string;
        title: string;
      }>;
      options:
        | Record<
            string,
            TabDescriptor<{
              key: string;
              title: string;
            }>
          >
        | undefined;
    },
  ) => (
    <TabBar
      {...props}
      style={{backgroundColor: theme.colors.surface}}
      indicatorStyle={{
        backgroundColor: theme.colors.primary,
      }}
      renderTabBarItem={itemProps => (
        <TabBarItem
          {...itemProps}
          labelStyle={{color: theme.colors.onSurface}}
        />
      )}
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

  const handleNavigateCourseX = useCallback(() => {
    if (detailNavigator) {
      detailNavigator.dispatch(StackActions.push('CourseX', {id: course.id}));
    } else {
      navigation.navigate('CourseXStack', {
        screen: 'CourseX',
        params: {
          id: course.id,
        },
      } as any);
    }
  }, [course.id, detailNavigator, navigation]);

  useLayoutEffect(() => {
    if (disableAnimation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);

  return (
    <SafeArea>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[
          styles.courseXContainer,
          {backgroundColor: theme.colors.surface},
        ]}
        onPress={handleNavigateCourseX}>
        <Icon
          style={styles.icon}
          color={theme.colors.onSurface}
          name="info-outline"
          size={20}
        />
        <Text style={styles.textButton}>{t('courseInformation')}</Text>
      </TouchableOpacity>
      <Divider />
      <TabView
        navigationState={{index, routes}}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        tabBarPosition="top"
        initialLayout={{width: Dimensions.get('window').width}}
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
  textButton: {
    fontSize: 16,
  },
});

export default CourseDetail;
