import * as Haptics from 'expo-haptics';
import {FuseOptions} from 'fuse.js';
import React, {useEffect} from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Provider as PaperProvider, Searchbar} from 'react-native-paper';
import {connect} from 'react-redux';
import EmptyList from '../components/EmptyList';
import FileCard from '../components/FileCard';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import {shareFile} from '../helpers/share';
import {showToast} from '../helpers/toast';
import useSearchBar from '../hooks/useSearchBar';
import {login} from '../redux/actions/auth';
import {getCoursesForSemester} from '../redux/actions/courses';
import {
  getAllFilesForCourses,
  pinFile,
  unpinFile,
} from '../redux/actions/files';
import {
  ICourse,
  IFile,
  IPersistAppState,
  withCourseInfo,
} from '../redux/types/state';
import {INavigationScreen} from '../types/NavigationScreen';

interface IFilesScreenStateProps {
  readonly autoRefreshing: boolean;
  readonly loggedIn: boolean;
  readonly username: string;
  readonly password: string;
  readonly semesterId: string;
  readonly courses: ReadonlyArray<ICourse>;
  readonly files: ReadonlyArray<IFile>;
  readonly isFetching: boolean;
  readonly pinnedFiles: readonly string[];
  readonly hidden: readonly string[];
}

interface IFilesScreenDispatchProps {
  readonly getCoursesForSemester: (semesterId: string) => void;
  // tslint:disable-next-line: readonly-array
  readonly getAllFilesForCourses: (courseIds: string[]) => void;
  readonly pinFile: (fileId: string) => void;
  readonly unpinFile: (fileId: string) => void;
  readonly login: (username: string, password: string) => void;
}

type IFilesScreenProps = IFilesScreenStateProps & IFilesScreenDispatchProps;

const FilesScreen: INavigationScreen<IFilesScreenProps> = props => {
  const {
    loggedIn,
    username,
    password,
    semesterId,
    courses,
    files: rawFiles,
    isFetching,
    getCoursesForSemester,
    getAllFilesForCourses,
    autoRefreshing,
    pinFile,
    pinnedFiles,
    unpinFile,
    hidden,
    login,
  } = props;

  /**
   * Prepare data
   */

  const courseIds = courses.map(course => course.id);
  const courseNames = courses.reduce(
    (a, b) => ({
      ...a,
      ...{
        [b.id]: {courseName: b.name, courseTeacherName: b.teacherName},
      },
    }),
    {},
  ) as {
    readonly [id: string]: {
      readonly courseName: string;
      readonly courseTeacherName: string;
    };
  };

  const files = [...rawFiles]
    .sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix())
    .map(file => ({
      ...file,
      ...courseNames[file.courseId],
    }));

  /**
   * Fetch and handle error
   */

  useEffect(() => {
    if (courses.length === 0 && loggedIn && semesterId) {
      getCoursesForSemester(semesterId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, semesterId, courses.length]);

  useEffect(() => {
    if (autoRefreshing || files.length === 0) {
      invalidateAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.length, loggedIn]);

  const invalidateAll = () => {
    if (courseIds.length !== 0) {
      if (loggedIn) {
        getAllFilesForCourses(courseIds);
      } else {
        showToast(getTranslation('refreshFailure'), 1500);
        login(username, password);
      }
    }
  };

  /**
   * Render cards
   */

  const onFileCardPress = async (fileId: string, reactTag?: number) => {
    const file = files.find(item => item.id === fileId);

    if (file) {
      if (DeviceInfo.isIPad()) {
        Navigation.setStackRoot('detail.root', [
          {
            component: {
              name: 'webview',
              passProps: {
                filename: file.title,
                url: file.downloadUrl,
                ext: file.fileType,
              },
              options: {
                topBar: {
                  title: {
                    text: file.title,
                  },
                },
                animations: {
                  setStackRoot: {
                    enabled: false,
                  },
                } as any,
              },
            },
          },
        ]);
      } else if (Platform.OS === 'ios') {
        Navigation.push(props.componentId, {
          component: {
            name: 'webview',
            passProps: {
              filename: file.title,
              url: file.downloadUrl,
              ext: file.fileType,
            },
            options: {
              topBar: {
                title: {
                  text: file.title,
                },
              },
              preview: {
                reactTag,
                commit: true,
              },
            },
          },
        });
      } else {
        showToast(getTranslation('downloadingFile'), 1000);
        const success = await shareFile(
          file.downloadUrl,
          file.title,
          file.fileType,
        );
        if (!success) {
          showToast(getTranslation('downloadFileFailure'), 3000);
        }
      }
    }
  };

  const onPinned = (pin: boolean, fileId: string) => {
    if (pin) {
      pinFile(fileId);
    } else {
      unpinFile(fileId);
    }
  };

  const renderListItem = ({item}: {readonly item: withCourseInfo<IFile>}) => (
    <FileCard
      title={item.title}
      extension={item.fileType}
      size={item.size}
      date={item.uploadTime}
      description={item.description}
      markedImportant={item.markedImportant}
      courseName={item.courseName}
      courseTeacherName={item.courseTeacherName}
      dragEnabled={item.courseName && item.courseTeacherName ? true : false}
      pinned={pinnedFiles.includes(item.id)}
      // tslint:disable: jsx-no-lambda
      onPinned={pin => onPinned!(pin, item.id)}
      onPress={() => {
        onFileCardPress(item.id, undefined);
      }}
      onPressIn={
        DeviceInfo.isIPad()
          ? undefined
          : (e: {readonly reactTag: number | null}) => {
              onFileCardPress(item.id, e.reactTag!);
            }
      }
      // tslint:enable: jsx-no-lambda
    />
  );

  /**
   * iOS Refresh
   */

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY < -60 && !isFetching) {
      showToast(getTranslation('refreshing'), 3000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      invalidateAll();
    }
  };

  /**
   * Android Refresh
   */

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    withCourseInfo<IFile>
  >(files, pinnedFiles, hidden, fuseOptions);

  return (
    <PaperProvider>
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{elevation: 4}}
            clearButtonMode="always"
            placeholder={getTranslation('searchFiles')}
            onChangeText={setSearchBarText}
            value={searchBarText}
          />
        )}
        <FlatList
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          // tslint:disable-next-line: jsx-no-lambda
          keyExtractor={item => item.id}
          onScrollEndDrag={Platform.OS === 'ios' ? onScrollEndDrag : undefined}
          refreshControl={
            Platform.OS === 'android' ? (
              <RefreshControl
                colors={[Colors.theme]}
                onRefresh={onRefresh}
                refreshing={isFetching}
              />
            ) : (
              undefined
            )
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions: FuseOptions<withCourseInfo<IFile>> = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: ['description', 'fileType', 'title'],
};

// tslint:disable-next-line: no-object-mutation
FilesScreen.options = {
  topBar: {
    title: {
      text: getTranslation('files'),
    },
    largeTitle: {
      visible: true,
    },
    searchBar: true,
    searchBarHiddenWhenScrolling: true,
    searchBarPlaceholder: getTranslation('searchFiles'),
    hideNavBarOnFocusSearchBar: true,
    elevation: 0,
  },
};

function mapStateToProps(state: IPersistAppState): IFilesScreenStateProps {
  return {
    autoRefreshing: state.settings.autoRefreshing,
    loggedIn: state.auth.loggedIn,
    username: state.auth.username || '',
    password: state.auth.password || '',
    semesterId: state.currentSemester,
    courses: state.courses.items,
    isFetching: state.files.isFetching,
    files: state.files.items,
    pinnedFiles: state.files.pinned || [],
    hidden: state.courses.hidden || [],
  };
}

// tslint:disable: readonly-array
const mapDispatchToProps: IFilesScreenDispatchProps = {
  getCoursesForSemester: (semesterId: string) =>
    getCoursesForSemester(semesterId),
  getAllFilesForCourses: (courseIds: string[]) =>
    getAllFilesForCourses(courseIds),
  pinFile: (fileId: string) => pinFile(fileId),
  unpinFile: (fileId: string) => unpinFile(fileId),
  login: (username: string, password: string) => login(username, password),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(FilesScreen);
