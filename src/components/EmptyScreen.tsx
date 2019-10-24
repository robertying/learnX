import React from 'react';
import {SafeAreaView} from 'react-native';
import EmptyList from './EmptyList';
import {useDarkMode} from 'react-native-dark-mode';

const EmptyScreen: React.FC = () => {
  const isDarkMode = useDarkMode();

  return (
    <SafeAreaView
      style={{
        backgroundColor: isDarkMode ? 'black' : 'white',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <EmptyList />
    </SafeAreaView>
  );
};

export default EmptyScreen;
