import {useLayoutEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ParamListBase} from '@react-navigation/native';
import {ExtraParams} from 'screens/types';

const useNavigationAnimation = <T extends keyof ParamListBase>({
  navigation,
  route,
}: NativeStackScreenProps<ParamListBase, T>) => {
  const disableAnimation = (route.params as ExtraParams)?.disableAnimation;

  useLayoutEffect(() => {
    if (disableAnimation && navigation) {
      navigation.setOptions({
        animation: 'none',
      });
    }
  }, [navigation, disableAnimation]);
};

export default useNavigationAnimation;
