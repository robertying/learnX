import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Platform,
  SafeAreaView,
  Text,
  StyleSheet,
  Linking,
} from 'react-native';
import mime from 'mime-types';
import {Navigation} from 'react-native-navigation';
import {WebView} from 'react-native-webview';
import PlaceholderLight from '../components/PlaceholderLight';
import PlaceholderDark from '../components/PlaceholderDark';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {downloadFile, shareFile, RNFetchBlob} from '../helpers/fs';
import Snackbar from 'react-native-snackbar';
import {INavigationScreen} from '../types';
import DeviceInfo from '../constants/DeviceInfo';
import {needWhiteBackground} from '../helpers/html';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {
  ProgressBar,
  IconButton,
  DarkTheme,
  DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import {iOSUIKit} from 'react-native-typography';
import {useColorScheme} from 'react-native-appearance';

export interface IFilePreviewScreenProps {
  courseName: string;
  filename: string;
  url: string;
  ext: string;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'column',
    alignItems: 'center',
  },
});

const FilePreviewScreen: INavigationScreen<IFilePreviewScreenProps> = (
  props,
) => {
  const {url, ext, filename, courseName} = props;

  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (DeviceInfo.isIPad()) {
      Navigation.mergeOptions(props.componentId, {
        topBar: {
          rightButtons: [
            {
              id: 'share',
              systemItem: 'action',
            },
            {
              id: 'refresh',
              systemItem: 'refresh',
            },
            {
              id: 'toggle',
              systemItem: 'rewind',
            },
          ],
        },
      });
    }
  }, [props.componentId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const filePath = await downloadFile(
          url,
          filename,
          ext,
          courseName,
          false,
          setProgress,
        );
        setFilePath(filePath);
      } catch {
        Snackbar.show({
          text: getTranslation('downloadFileFailure'),
          duration: Snackbar.LENGTH_SHORT,
        });
      } finally {
        setLoading(false);
        setProgress(0);
      }
    })();
  }, [ext, filename, url, courseName]);

  const fullScreenRef = useRef<boolean>(false);

  const listener = useCallback(
    async ({buttonId}: {buttonId: string}) => {
      if (buttonId === 'toggle') {
        const fullScreen = fullScreenRef.current!;
        Navigation.mergeOptions(props.componentId, {
          splitView: {
            displayMode: fullScreen ? 'visible' : 'hidden',
          },
          topBar: {
            rightButtons: DeviceInfo.isIPad()
              ? [
                  {
                    id: 'share',
                    systemItem: 'action',
                  },
                  {
                    id: 'refresh',
                    systemItem: 'refresh',
                  },
                  {
                    id: 'toggle',
                    systemItem: fullScreen ? 'rewind' : 'fastForward',
                  },
                ]
              : [
                  {
                    id: 'share',
                    systemItem: 'action',
                  },
                  {
                    id: 'refresh',
                    systemItem: 'refresh',
                  },
                ],
          },
        });
        fullScreenRef.current = !fullScreen;
      }
      if (buttonId === 'share') {
        Snackbar.show({
          text: getTranslation('preparingFile'),
          duration: Snackbar.LENGTH_SHORT,
        });
        try {
          shareFile(url, filename, ext, courseName);
        } catch {
          Snackbar.show({
            text: getTranslation('shareFail'),
            duration: Snackbar.LENGTH_SHORT,
          });
        }
      }
      if (buttonId === 'refresh') {
        setLoading(true);
        try {
          const filePath = await downloadFile(
            url,
            filename,
            ext,
            courseName,
            true,
            setProgress,
          );
          setFilePath(filePath);
        } catch {
          Snackbar.show({
            text: getTranslation('downloadFileFailure'),
            duration: Snackbar.LENGTH_SHORT,
          });
        } finally {
          setLoading(false);
          setProgress(0);
        }
      }
      if (buttonId === 'open') {
        RNFetchBlob.android.actionViewIntent(
          filePath,
          mime.lookup(ext) || 'text/plain',
        );
      }
    },
    [ext, filename, props.componentId, url, courseName, filePath],
  );

  useEffect(() => {
    const handle = Navigation.events().registerNavigationButtonPressedListener(
      listener,
    );
    return () => handle.remove();
  }, [listener]);

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const webViewRef = useRef<WebView>(null);
  const reloadCount = useRef(0);

  const handleProcessTerminate = () => {
    if (reloadCount.current <= 2) {
      webViewRef.current?.reload();
      reloadCount.current++;
    }
  };

  return (
    <PaperProvider theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{flex: 1}}>
        {Platform.OS === 'android' && loading && (
          <ProgressBar
            progress={progress}
            color={Colors.system('purple', colorScheme)}
          />
        )}
        {Platform.OS === 'ios' &&
          !DeviceInfo.isMac() &&
          !loading &&
          (filePath ? true : false) && (
            <WebView
              ref={webViewRef}
              style={{
                backgroundColor: needWhiteBackground(ext)
                  ? 'white'
                  : 'transparent',
              }}
              source={{
                uri: filePath,
              }}
              originWhitelist={['*']}
              decelerationRate="normal"
              onContentProcessDidTerminate={handleProcessTerminate}
            />
          )}
        {Platform.OS === 'android' && (
          <View
            style={{
              flex: 1,
              backgroundColor: Colors.system('background', colorScheme),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={[
                colorScheme === 'dark'
                  ? iOSUIKit.largeTitleEmphasizedWhite
                  : iOSUIKit.largeTitleEmphasized,
                {marginHorizontal: 20, textAlign: 'center'},
              ]}>{`${filename}.${ext}`}</Text>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}>
              <View style={styles.button}>
                <IconButton
                  icon="refresh"
                  color={Colors.system('purple', colorScheme)}
                  size={50}
                  onPress={() => listener({buttonId: 'refresh'}) as any}
                />
                <Text style={{color: Colors.system('foreground', colorScheme)}}>
                  {getTranslation('refresh')}
                </Text>
              </View>
              <View style={styles.button}>
                <IconButton
                  disabled={loading || !filePath}
                  icon="open-in-new"
                  color={Colors.system('purple', colorScheme)}
                  size={50}
                  onPress={() => listener({buttonId: 'open'}) as any}
                />
                <Text style={{color: Colors.system('foreground', colorScheme)}}>
                  {getTranslation('open')}
                </Text>
              </View>
            </View>
          </View>
        )}
        {Platform.OS === 'ios' &&
          loading &&
          (colorScheme === 'dark' ? (
            <View
              style={{
                backgroundColor: 'black',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}>
              <PlaceholderDark style={{margin: 15}} loading={true} />
              <PlaceholderDark style={{margin: 15}} loading={true} />
              <PlaceholderDark style={{margin: 15}} loading={true} />
              <PlaceholderDark style={{margin: 15}} loading={true} />
            </View>
          ) : (
            <View
              style={{
                backgroundColor: 'white',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}>
              <PlaceholderLight style={{margin: 15}} loading={true} />
              <PlaceholderLight style={{margin: 15}} loading={true} />
              <PlaceholderLight style={{margin: 15}} loading={true} />
              <PlaceholderLight style={{margin: 15}} loading={true} />
            </View>
          ))}
        {Platform.OS === 'ios' && loading && (
          <ProgressBar progress={progress} color={Colors.theme} />
        )}
        {DeviceInfo.isMac() && (
          <View
            style={{
              flex: 1,
              backgroundColor: Colors.system('background', colorScheme),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={[
                colorScheme === 'dark'
                  ? iOSUIKit.largeTitleEmphasizedWhite
                  : iOSUIKit.largeTitleEmphasized,
                {marginHorizontal: 20, textAlign: 'center'},
              ]}>{`${filename}.${ext}`}</Text>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}>
              <View style={styles.button}>
                <IconButton
                  disabled={loading || !filePath}
                  icon="open-in-new"
                  color={Colors.system('purple', colorScheme)}
                  size={50}
                  onPress={() => {
                    Linking.openURL(filePath);
                  }}
                />
                <Text style={{color: Colors.system('foreground', colorScheme)}}>
                  {getTranslation('open')}
                </Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </PaperProvider>
  );
};

FilePreviewScreen.options = {
  topBar: {
    rightButtons: [
      {
        id: 'share',
        systemItem: 'action',
      },
      {
        id: 'refresh',
        systemItem: 'refresh',
      },
    ],
  },
};

export default FilePreviewScreen;
