import React, {useEffect} from 'react';
import {FlatList, ListRenderItem, SafeAreaView} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useDispatch} from 'react-redux';
import SettingListItem from '../components/SettingListItem';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {setCurrentSemester} from '../redux/actions/currentSemester';
import {getAllSemesters} from '../redux/actions/semesters';
import {INavigationScreen} from '../types';
import {getScreenOptions} from '../helpers/navigation';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import {useTypedSelector} from '../redux/store';

const SemesterSettingScreen: INavigationScreen = props => {
  const colorScheme = useColorScheme();

  const dispatch = useDispatch();
  const currentSemester = useTypedSelector(state => state.currentSemester);
  const semesters = useTypedSelector(state => state.semesters.items);

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme, true);
  }, [colorScheme, props.componentId]);

  useEffect(() => {
    dispatch(getAllSemesters());
  }, [dispatch]);

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
        onPress={() => dispatch(setCurrentSemester(item))}
      />
    );
  };

  const keyExtractor = (item: string) => item;

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

export default SemesterSettingScreen;
