import React, {useEffect} from 'react';
import {FlatList, ListRenderItem, SafeAreaView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {connect} from 'react-redux';
import SettingListItem from '../components/SettingListItem';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {getCoursesForSemester} from '../redux/actions/courses';
import {setCurrentSemester} from '../redux/actions/currentSemester';
import {getAllSemesters} from '../redux/actions/semesters';
import {IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';

interface ISemestersSettingsScreenStateProps {
  semesters: string[];
  currentSemester: string;
}

interface ISemestersSettingsScreenDispatchProps {
  setCurrentSemester: (semesterId: string) => void;
  getCoursesForSemester: (semesterId: string) => void;
  getAllSemesters: () => void;
}

type ISemestersSettingsScreenProps = ISemestersSettingsScreenStateProps &
  ISemestersSettingsScreenDispatchProps;

const SemesterSettingScreen: INavigationScreen<ISemestersSettingsScreenProps> = props => {
  const {
    semesters,
    currentSemester,
    setCurrentSemester,
    getCoursesForSemester,
    getAllSemesters,
  } = props;

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  useEffect(() => {
    getAllSemesters();
  }, [getAllSemesters]);

  useEffect(() => {
    getCoursesForSemester(currentSemester);
  }, [currentSemester, getCoursesForSemester]);

  const renderListItem: ListRenderItem<string> = ({item}) => {
    return (
      <SettingListItem
        variant="none"
        text={item}
        icon={
          currentSemester === item ? (
            <Icon
              name="check"
              size={20}
              color={
                colorScheme === 'dark'
                  ? Colors.system('gray', 'dark')
                  : undefined
              }
            />
          ) : null
        }
        onPress={() => setCurrentSemester(item)}
      />
    );
  };

  const keyExtractor = (item: any) => item as string;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors.system('background', colorScheme),
      }}>
      <FlatList
        style={{
          backgroundColor: Colors.system('background', colorScheme),
        }}
        contentContainerStyle={{marginTop: 10}}
        data={semesters}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
      />
    </SafeAreaView>
  );
};

SemesterSettingScreen.options = getScreenOptions(
  getTranslation('changeSemester'),
);

function mapStateToProps(
  state: IPersistAppState,
): ISemestersSettingsScreenStateProps {
  return {
    semesters: state.semesters.items,
    currentSemester: state.currentSemester,
  };
}

const mapDispatchToProps: ISemestersSettingsScreenDispatchProps = {
  setCurrentSemester,
  getCoursesForSemester,
  getAllSemesters,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SemesterSettingScreen);
