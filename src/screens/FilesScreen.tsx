import React, {useEffect, useMemo, useState, useCallback} from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  PushNotificationIOS,
  PushNotification,
  View,
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
import {IFilePreviewScreenProps} from './FilePreviewScreen';
import {getFuseOptions} from '../helpers/search';
import {
  requestNotificationPermission,
  showNotificationPermissionAlert,
  scheduleNotification,
} from '../helpers/notification';
import {removeTags} from '../helpers/html';
import Snackbar from 'react-native-snackbar';
import Modal from 'react-native-modal';
import Layout from '../constants/Layout';
import Button from '../components/Button';
import Text from '../components/Text';
import DateTimePicker from '@react-native-community/datetimepicker';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';
import SegmentedControl from '../components/SegmentedControl';

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

  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode);
  }, [isDarkMode, props.componentId]);

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

  const onFileCardPress = useCallback(
    (file: WithCourseInfo<IFile>) => {
      const name = 'webview';
      const passProps = {
        filename: file.title,
        url: file.downloadUrl,
        ext: file.fileType,
      };
      const title = file.title;

      if (DeviceInfo.isIPad() && !compactWidth) {
        setDetailView<IFilePreviewScreenProps>(name, passProps, title);
      } else {
        pushTo<IFilePreviewScreenProps>(
          name,
          props.componentId,
          passProps,
          title,
          false,
          isDarkMode,
        );
      }
    },
    [compactWidth, isDarkMode, props.componentId],
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      (async () => {
        const notification = await PushNotificationIOS.getInitialNotification();
        if (notification) {
          const data = notification.getData();
          if ((data as IFile).downloadUrl) {
            onFileCardPress(data as WithCourseInfo<IFile>);
          }
        }
      })();
    }
  }, [onFileCardPress]);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const listener = (notification: PushNotification) => {
        const data = notification.getData();
        if ((data as IFile).downloadUrl) {
          onFileCardPress(data as WithCourseInfo<IFile>);
        }
      };
      PushNotificationIOS.addEventListener('localNotification', listener);
      return () =>
        PushNotificationIOS.removeEventListener('localNotification', listener);
    }
  }, [onFileCardPress]);

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
      onRemind={() => handleRemind(item)}
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
    if (value.startsWith(getTranslation('new'))) {
      setSegment('new');
      setCurrentDisplayFiles(newFiles);
    } else if (value.startsWith(getTranslation('favorite'))) {
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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderInfo, setReminderInfo] = useState<WithCourseInfo<IFile>>();
  const [dateAndroid, setDateAndroid] = useState<Date | null>(null);
  const [timeAndroid, setTimeAndroid] = useState<Date | null>(null);

  const handleRemind = async (notice: WithCourseInfo<IFile>) => {
    if (!(await requestNotificationPermission())) {
      showNotificationPermissionAlert();
      return;
    }
    setDateAndroid(null);
    setTimeAndroid(null);
    setPickerVisible(true);
    setReminderInfo(notice);
  };

  const handleReminderSet = useCallback(() => {
    if (!reminderInfo) {
      return;
    }

    let date = reminderDate;
    if (Platform.OS === 'android') {
      dateAndroid!.setHours(
        timeAndroid!.getHours(),
        timeAndroid!.getMinutes(),
        0,
        0,
      );
      date = dateAndroid!;
    }

    scheduleNotification(
      `${getTranslation('reminder')}：${reminderInfo.courseName}`,
      `${reminderInfo.title}\n${removeTags(
        reminderInfo.description || getTranslation('noFileDescription'),
      )}`,
      date,
      reminderInfo,
    );
    setPickerVisible(false);
    setReminderInfo(undefined);
    Snackbar.show({
      title: getTranslation('reminderSet'),
      duration: Snackbar.LENGTH_SHORT,
    });
  }, [dateAndroid, reminderDate, reminderInfo, timeAndroid]);

  const handleDateChange = (_: any, date?: Date) => {
    if (date) {
      if (Platform.OS === 'ios') {
        setReminderDate(date);
      } else {
        if (!dateAndroid) {
          setDateAndroid(date);
        } else {
          setTimeAndroid(date);
          setPickerVisible(false);
        }
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android' && dateAndroid && timeAndroid) {
      handleReminderSet();
      setDateAndroid(null);
      setTimeAndroid(null);
    }
  }, [dateAndroid, handleReminderSet, timeAndroid]);

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
            <SegmentedControl
              values={[
                getTranslation('new') + ` (${newFiles.length})`,
                getTranslation('favorite') + ` (${favFiles.length})`,
                getTranslation('hidden') + ` (${hiddenFiles.length})`,
              ]}
              selectedIndex={
                segment === 'new' ? 0 : segment === 'favorite' ? 1 : 2
              }
              onValueChange={handleSegmentChange}
            />
          }
          refreshControl={
            <RefreshControl
              colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
              onRefresh={onRefresh}
              refreshing={isFetching}
            />
          }
        />
        {Platform.OS === 'android' ? (
          pickerVisible &&
          (!dateAndroid || !timeAndroid) && (
            <DateTimePicker
              mode={dateAndroid ? 'time' : 'date'}
              minimumDate={new Date()}
              value={reminderDate}
              onChange={handleDateChange}
            />
          )
        ) : (
          <Modal
            isVisible={pickerVisible}
            onBackdropPress={() => setPickerVisible(false)}
            backdropColor={isDarkMode ? 'rgba(255,255,255,0.25)' : undefined}
            animationIn="bounceIn"
            animationOut="zoomOut"
            useNativeDriver={true}
            deviceWidth={Layout.initialWindow.width}
            deviceHeight={Layout.initialWindow.height}>
            <DateTimePicker
              style={{backgroundColor: isDarkMode ? 'black' : 'white'}}
              mode="datetime"
              minimumDate={new Date()}
              value={reminderDate}
              onChange={handleDateChange}
            />
            {Platform.OS === 'ios' && (
              <View
                style={{
                  backgroundColor: isDarkMode ? 'black' : 'white',
                  width: '100%',
                  height: 50,
                  paddingHorizontal: 15,
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}>
                <Button
                  style={{marginHorizontal: 20}}
                  onPress={() => setPickerVisible(false)}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: isDarkMode
                        ? Colors.purpleDark
                        : Colors.purpleLight,
                    }}>
                    {getTranslation('cancel')}
                  </Text>
                </Button>
                <Button
                  style={{marginHorizontal: 20}}
                  onPress={handleReminderSet}>
                  <Text
                    style={{
                      fontSize: 18,
                      color: isDarkMode
                        ? Colors.purpleDark
                        : Colors.purpleLight,
                    }}>
                    {getTranslation('ok')}
                  </Text>
                </Button>
              </View>
            )}
          </Modal>
        )}
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
