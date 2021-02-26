import {useLayoutEffect} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {ScreenParams, ExtraParams} from 'screens/types';

const useNavigationAnimation = <T extends keyof ScreenParams>({
  navigation,
  route,
}: StackScreenProps<ScreenParams, T>) => {
  const disableAnimation = (route.params as ExtraParams)?.disableAnimation;

  useLayoutEffect(() => {
    if (disableAnimation && navigation) {
      navigation.setOptions({
        animationEnabled: false,
      });
    }
  }, [navigation, disableAnimation]);
};

export default useNavigationAnimation;
