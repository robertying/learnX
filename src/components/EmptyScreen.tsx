import React from 'react';
import {SafeAreaView} from 'react-native';
import EmptyList from './EmptyList';
import {useColorScheme} from 'react-native-appearance';
import Colors from '../constants/Colors';

const EmptyScreen: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView
      style={{
        backgroundColor: Colors.system('background', colorScheme),
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <EmptyList />
    </SafeAreaView>
  );
};

export default EmptyScreen;
