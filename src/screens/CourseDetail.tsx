import { memo, useCallback, useContext, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Divider, Text, useTheme } from 'react-native-paper';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  SceneRendererProps,
  TabView,
  NavigationState,
} from 'react-native-tab-view';
import Icon from '@react-native-vector-icons/material-icons';
import { Assignment, File, Notice } from 'data/types/state';
import { useAppDispatch, useAppSelector } from 'data/store';
import { getNoticesForCourse } from 'data/actions/notices';
import { getAssignmentsForCourse } from 'data/actions/assignments';
import { getFilesForCourse } from 'data/actions/files';
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
import { CourseStackParams } from './types';

const listContentInsetAdjustmentBehavior = DeviceInfo.isMac()
  ? ('never' as const)
  : ('automatic' as const);

type NavigationProp = NativeStackNavigationProp<
  CourseStackParams,
  'CourseDetail'
>;

const Notices = memo(
  ({ courseId, data }: { courseId: string; data: Notice[] }) => {
    const navigation = useNavigation<NavigationProp>();

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
        renderItem={({ item }) => (
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
        contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
        contentContainerStyle={[
          { flexGrow: 1 },
          data.length ? null : { justifyContent: 'center' },
        ]}
        ListEmptyComponent={<Empty />}
      />
    );
  },
);

const Assignments = memo(
  ({ courseId, data }: { courseId: string; data: Assignment[] }) => {
    const navigation = useNavigation<NavigationProp>();

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
        renderItem={({ item }) => (
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
        contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
        contentContainerStyle={[
          { flexGrow: 1 },
          data.length ? null : { justifyContent: 'center' },
        ]}
        ListEmptyComponent={<Empty />}
      />
    );
  },
);

const Files = memo(({ courseId, data }: { courseId: string; data: File[] }) => {
  const navigation = useNavigation<NavigationProp>();

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
      renderItem={({ item }) => (
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
      contentInsetAdjustmentBehavior={listContentInsetAdjustmentBehavior}
      contentContainerStyle={[
        { flexGrow: 1 },
        data.length ? null : { justifyContent: 'center' },
      ]}
      ListEmptyComponent={<Empty />}
    />
  );
});

const routes = [
  { key: 'notice', title: t('notices') },
  { key: 'assignment', title: t('assignments') },
  { key: 'file', title: t('files') },
];

type Props = NativeStackScreenProps<CourseStackParams, 'CourseDetail'>;

const CourseDetail: React.FC<Props> = ({ navigation, route }) => {
  const { disableAnimation: _disableAnimation, ...course } = route.params;

  const theme = useTheme();

  const detailNavigator = useDetailNavigator();
  const { masterWidth } = useContext(SplitViewContext);

  const notices = useAppSelector(state => state.notices.items);
  const assignments = useAppSelector(state => state.assignments.items);
  const files = useAppSelector(state => state.files.items);

  const [index, setIndex] = useState(0);

  // Laid out with flex and percentages rather than the measured width that
  // TabBar goes by, so that it keeps up as the column is resized (e.g. while
  // a sidebar slides in or out). Only the indicator's movement between tabs
  // during a swipe is measured, and it is nothing once the pager comes to rest.
  const renderTabBar = ({
    navigationState,
    position,
    layout,
    jumpTo,
  }: SceneRendererProps & {
    navigationState: NavigationState<{
      key: string;
      title: string;
    }>;
  }) => {
    const tabCount = navigationState.routes.length;
    const tabWidth = layout.width / tabCount;

    return (
      <View
        style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}
        accessibilityRole="tablist"
      >
        {navigationState.routes.map((route, i) => (
          <Pressable
            key={route.key}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === navigationState.index }}
            android_ripple={{ color: theme.colors.surfaceVariant }}
            onPress={() => jumpTo(route.key)}
          >
            <Text style={[styles.tabLabel, { color: theme.colors.onSurface }]}>
              {route.title}
            </Text>
          </Pressable>
        ))}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tabIndicator,
            {
              backgroundColor: theme.colors.primary,
              width: `${100 / tabCount}%`,
              start: `${(100 / tabCount) * navigationState.index}%`,
              transform: [
                {
                  translateX: tabWidth
                    ? Animated.multiply(
                        Animated.subtract(position, navigationState.index),
                        tabWidth,
                      )
                    : 0,
                },
              ],
            },
          ]}
        />
      </View>
    );
  };

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
      detailNavigator.dispatch(StackActions.push('CourseX', { id: course.id }));
    } else {
      navigation.navigate(
        'CourseXStack' as any,
        {
          screen: 'CourseX',
          params: {
            id: course.id,
          },
        } as any,
      );
    }
  }, [course.id, detailNavigator, navigation]);

  return (
    <SafeArea>
      <TouchableOpacity
        activeOpacity={0.6}
        style={[
          styles.courseXContainer,
          { backgroundColor: theme.colors.surface },
        ]}
        onPress={handleNavigateCourseX}
      >
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
  textButton: {
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    minHeight: 48,
  },
  tabLabel: {
    margin: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
  },
});

export default CourseDetail;
