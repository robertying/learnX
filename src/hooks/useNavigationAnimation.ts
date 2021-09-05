import {useLayoutEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScreenParams, ExtraParams} from 'screens/types';

const useNavigationAnimation = <T extends keyof ScreenParams>({
  navigation,
  route,
}: NativeStackScreenProps<ScreenParams, T>) => {
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
