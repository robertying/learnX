import React, {useEffect} from 'react';
import {FlatList, ListRenderItem, SafeAreaView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {connect} from 'react-redux';
import SettingsListItem from '../components/SettingsListItem';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {getCoursesForSemester} from '../redux/actions/courses';
import {setCurrentSemester} from '../redux/actions/currentSemester';
import {getAllSemesters} from '../redux/actions/semesters';
import {IPersistAppState} from '../redux/types/state';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
import {getScreenOptions} from '../helpers/navigation';
import {androidAdaptToSystemTheme} from '../helpers/darkmode';

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

const SemestersSettingsScreen: INavigationScreen<
  ISemestersSettingsScreenProps
> = props => {
  const {
    semesters,
    currentSemester,
    setCurrentSemester,
    getCoursesForSemester,
    getAllSemesters,
  } = props;

  const isDarkMode = useDarkMode();

  useEffect(() => {
    androidAdaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  useEffect(() => {
    getAllSemesters();
  }, [getAllSemesters]);

  useEffect(() => {
    getCoursesForSemester(currentSemester);
  }, [currentSemester, getCoursesForSemester]);

  const renderListItem: ListRenderItem<string> = ({item}) => {
    return (
      <SettingsListItem
        variant="none"
        text={item}
        icon={
          currentSemester === item ? (
            <Icon
              name="check"
              size={20}
              color={isDarkMode ? Colors.grayDark : undefined}
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
        backgroundColor: isDarkMode ? 'black' : 'white',
      }}>
      <FlatList
        style={{
          backgroundColor: isDarkMode ? 'black' : 'white',
        }}
        contentContainerStyle={{marginTop: 10}}
        data={semesters}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
      />
    </SafeAreaView>
  );
};

SemestersSettingsScreen.options = getScreenOptions(
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
)(SemestersSettingsScreen);
