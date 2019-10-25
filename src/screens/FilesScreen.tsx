import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  SegmentedControlIOS,
} from 'react-native';
import {
  Provider as PaperProvider,
  Searchbar,
  DefaultTheme,
  DarkTheme,
} from 'react-native-paper';
import {connect} from 'react-redux';
import EmptyList from '../components/EmptyList';
import FileCard from '../components/FileCard';
import Colors from '../constants/Colors';
import DeviceInfo from '../constants/DeviceInfo';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import useSearchBar from '../hooks/useSearchBar';
import {
  getAllFilesForCourses,
  pinFile,
  unpinFile,
  favFile,
  unfavFile,
} from '../redux/actions/files';
import {ICourse, IFile, IPersistAppState} from '../redux/types/state';
import {INavigationScreen, WithCourseInfo} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {setDetailView, pushTo, getScreenOptions} from '../helpers/navigation';
import {IWebViewScreenProps} from './WebViewScreen';
import {getFuseOptions} from '../helpers/search';

interface IFilesScreenStateProps {
  loggedIn: boolean;
  courses: ICourse[];
  hiddenCourseIds: string[];
  isFetching: boolean;
  files: IFile[];
  pinnedFileIds: string[];
  favFileIds: string[];
  compactWidth: boolean;
}

interface IFilesScreenDispatchProps {
  getAllFilesForCourses: (courseIds: string[]) => void;
  pinFile: (fileId: string) => void;
  unpinFile: (fileId: string) => void;
  favFile: (fileId: string) => void;
  unfavFile: (fileId: string) => void;
}

type IFilesScreenProps = IFilesScreenStateProps & IFilesScreenDispatchProps;

const FilesScreen: INavigationScreen<IFilesScreenProps> = props => {
  const {
    loggedIn,
    courses,
    files,
    isFetching,
    getAllFilesForCourses,
    pinFile,
    pinnedFileIds,
    unpinFile,
    hiddenCourseIds,
    favFileIds,
    favFile,
    unfavFile,
    compactWidth,
  } = props;

  /**
   * Prepare data
   */

  const courseNames = useMemo(
    () =>
      courses.reduce(
        (a, b) => ({
          ...a,
          ...{
            [b.id]: {courseName: b.name, courseTeacherName: b.teacherName},
          },
        }),
        {},
      ) as {
        [id: string]: {
          courseName: string;
          courseTeacherName: string;
        };
      },
    [courses],
  );

  const sortedFiles = useMemo(
    () =>
      files
        .sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix())
        .map(file => ({
          ...file,
          ...courseNames[file.courseId],
        })),
    [files, courseNames],
  );

  const newFiles = useMemo(() => {
    const newFilesOnly = sortedFiles.filter(
      i => !favFileIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...newFilesOnly.filter(i => pinnedFileIds.includes(i.id)),
      ...newFilesOnly.filter(i => !pinnedFileIds.includes(i.id)),
    ];
  }, [favFileIds, hiddenCourseIds, pinnedFileIds, sortedFiles]);

  const favFiles = useMemo(() => {
    const favFilesOnly = sortedFiles.filter(
      i => favFileIds.includes(i.id) && !hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...favFilesOnly.filter(i => pinnedFileIds.includes(i.id)),
      ...favFilesOnly.filter(i => !pinnedFileIds.includes(i.id)),
    ];
  }, [favFileIds, hiddenCourseIds, pinnedFileIds, sortedFiles]);

  const hiddenFiles = useMemo(() => {
    const hiddenFilesOnly = sortedFiles.filter(i =>
      hiddenCourseIds.includes(i.courseId),
    );
    return [
      ...hiddenFilesOnly.filter(i => pinnedFileIds.includes(i.id)),
      ...hiddenFilesOnly.filter(i => !pinnedFileIds.includes(i.id)),
    ];
  }, [hiddenCourseIds, pinnedFileIds, sortedFiles]);

  const [currentDisplayFiles, setCurrentDisplayFiles] = useState(newFiles);

  /**
   * Fetch and handle error
   */

  const invalidateAll = useCallback(() => {
    if (loggedIn && courses.length !== 0) {
      getAllFilesForCourses(courses.map(i => i.id));
    }
  }, [courses, getAllFilesForCourses, loggedIn]);

  useEffect(() => {
    if (files.length === 0) {
      invalidateAll();
    }
  }, [invalidateAll, files.length]);

  /**
   * Render cards
   */

  const onFileCardPress = (file: WithCourseInfo<IFile>) => {
    const name = 'webview';
    const passProps = {
      filename: file.title,
      url: file.downloadUrl,
      ext: file.fileType,
    };
    const title = file.title;

    if (DeviceInfo.isIPad() && !compactWidth) {
      setDetailView<IWebViewScreenProps>(name, passProps, title);
    } else {
      pushTo<IWebViewScreenProps>(
        name,
        props.componentId,
        passProps,
        title,
        false,
        isDarkMode,
      );
    }
  };

  const onPinned = (pin: boolean, fileId: string) => {
    if (pin) {
      pinFile(fileId);
    } else {
      unpinFile(fileId);
    }
  };

  const onFav = (fav: boolean, fileId: string) => {
    if (fav) {
      favFile(fileId);
    } else {
      unfavFile(fileId);
    }
  };

  const renderListItem = ({item}: {item: WithCourseInfo<IFile>}) => (
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
      pinned={pinnedFileIds.includes(item.id)}
      onPinned={pin => onPinned(pin, item.id)}
      fav={favFileIds.includes(item.id)}
      onFav={fav => onFav(fav, item.id)}
      onPress={() => {
        onFileCardPress(item);
      }}
    />
  );

  /**
   * Refresh
   */

  const onRefresh = () => {
    invalidateAll();
  };

  /**
   * Search
   */

  const [searchResults, searchBarText, setSearchBarText] = useSearchBar<
    WithCourseInfo<IFile>
  >(currentDisplayFiles, fuseOptions);

  const [segment, setSegment] = useState('new');

  const handleSegmentChange = (value: string) => {
    if (value === getTranslation('new')) {
      setSegment('new');
      setCurrentDisplayFiles(newFiles);
    } else if (value === getTranslation('favorite')) {
      setSegment('favorite');
      setCurrentDisplayFiles(favFiles);
    } else {
      setSegment('hidden');
      setCurrentDisplayFiles(hiddenFiles);
    }
  };

  useEffect(() => {
    if (segment === 'new') {
      setCurrentDisplayFiles(newFiles);
    }
  }, [newFiles, segment]);

  useEffect(() => {
    if (segment === 'favorite') {
      setCurrentDisplayFiles(favFiles);
    }
  }, [favFiles, segment]);

  useEffect(() => {
    if (segment === 'hidden') {
      setCurrentDisplayFiles(hiddenFiles);
    }
  }, [hiddenFiles, segment]);

  const isDarkMode = useDarkMode();

  return (
    <PaperProvider theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        testID="FilesScreen"
        style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
        {Platform.OS === 'android' && (
          <Searchbar
            style={{
              elevation: 4,
              backgroundColor: isDarkMode ? 'black' : 'white',
            }}
            clearButtonMode="always"
            placeholder={getTranslation('searchFiles')}
            onChangeText={setSearchBarText}
            value={searchBarText || ''}
          />
        )}
        <FlatList
          style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
          ListEmptyComponent={EmptyList}
          data={searchResults}
          renderItem={renderListItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            Platform.OS === 'ios' ? (
              <SegmentedControlIOS
                style={{margin: 20, marginTop: 10, marginBottom: 10}}
                values={[
                  getTranslation('new'),
                  getTranslation('favorite'),
                  getTranslation('hidden'),
                ]}
                selectedIndex={0}
                onValueChange={handleSegmentChange}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

const fuseOptions = getFuseOptions<IFile>([
  'description',
  'fileType',
  'title',
  'courseName',
]);

FilesScreen.options = getScreenOptions(
  getTranslation('files'),
  getTranslation('searchFiles'),
);

function mapStateToProps(state: IPersistAppState): IFilesScreenStateProps {
  return {
    loggedIn: state.auth.loggedIn,
    courses: state.courses.items || [],
    isFetching: state.files.isFetching,
    files: state.files.items || [],
    favFileIds: state.files.favorites || [],
    pinnedFileIds: state.files.pinned || [],
    hiddenCourseIds: state.courses.hidden || [],
    compactWidth: state.settings.compactWidth,
  };
}

const mapDispatchToProps: IFilesScreenDispatchProps = {
  getAllFilesForCourses,
  pinFile,
  unpinFile,
  favFile,
  unfavFile,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(FilesScreen);
