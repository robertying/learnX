import {useEffect, useState} from 'react';
import {
  AppState,
  AppStateStatus,
  Linking,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Caption, Title} from 'react-native-paper';
import Clipboard from '@react-native-clipboard/clipboard';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import useToast from 'hooks/useToast';
import {t} from 'helpers/i18n';
import {registerForPushNotifications} from 'helpers/notification';
import {useAppDispatch} from 'data/store';
import {setSetting} from 'data/actions/settings';
import {ScreenParams} from './types';

const PushNotifications: React.FC<
  React.PropsWithChildren<
    NativeStackScreenProps<ScreenParams, 'PushNotifications'>
  >
> = props => {
  const toast = useToast();
  const dispatch = useAppDispatch();

  const [token, setToken] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);

  const handleTokenCopy = () => {
    if (token) {
      Clipboard.setString(token);
      toast(t('copied'), 'success');
    }
  };

  const getPushToken = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      const match = /\[(.*?)\]/.exec(token);
      setToken(match ? match[1] : null);
    } else {
      setToken(null);
    }
  };

  useNavigationAnimation(props);

  useEffect(() => {
    dispatch(setSetting('pushNotificationsBadgeShown', true));
  }, [dispatch]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          getPushToken();
        }
        setAppState(nextAppState);
      },
    );
    return () => sub.remove();
  });

  useEffect(() => {
    getPushToken();
  }, []);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        {token ? (
          <>
            <Title style={styles.title}>{token}</Title>
            <TableCell
              iconName="content-copy"
              primaryText={t('copyPushNotificationToken')}
              type="none"
              onPress={handleTokenCopy}
            />
            <Caption style={styles.caption}>
              {t('pushNotificationTokenDescription')}
            </Caption>
          </>
        ) : (
          <>
            <Title style={[styles.title, {fontStyle: 'italic'}]}>
              {t('noPushNotificationsPermission')}
            </Title>
            <TableCell
              iconName="settings"
              primaryText={t('configurePushNotifications')}
              type="none"
              onPress={() => Linking.openSettings()}
            />
          </>
        )}
        <TableCell
          style={styles.marginTop}
          iconName="open-in-new"
          primaryText={t('learnXCompanionUsageGuide')}
          type="none"
          onPress={() =>
            Linking.openURL('https://tsinghua.app/learnX-companion')
          }
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  title: {
    marginHorizontal: 16,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default PushNotifications;
