import React, {useEffect, useState, useRef, useCallback} from 'react';
import {View, StatusBar, Platform, SafeAreaView} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {WebView} from 'react-native-webview';
import MediumPlaceholder from '../components/MediumPlaceholder';
import MediumPlaceholderDark from '../components/MediumPlaceholderDark';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {downloadFile, shareFile} from '../helpers/share';
import SnackBar from 'react-native-snackbar';
import {INavigationScreen} from '../types';
import {useDarkMode} from 'react-native-dark-mode';
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
import Text from '../components/Text';
import {iOSUIKit} from 'react-native-typography';

export interface IFilePreviewScreenStateProps {
  filename: string;
  url: string;
  ext: string;
}

export type IFilePreviewScreenProps = IFilePreviewScreenStateProps;

const FilePreviewScreen: INavigationScreen<IFilePreviewScreenProps> = props => {
  const {url, ext, filename} = props;

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
          false,
          setProgress,
        );
        setFilePath(filePath);
      } catch {
        SnackBar.show({
          title: getTranslation('downloadFileFailure'),
          duration: SnackBar.LENGTH_SHORT,
        });
      } finally {
        setLoading(false);
        setProgress(0);
      }
    })();
  }, [ext, filename, url]);

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
        SnackBar.show({
          title: getTranslation('preparingFile'),
          duration: SnackBar.LENGTH_SHORT,
        });
        shareFile(url, filename, ext);
      }
      if (buttonId === 'refresh') {
        setLoading(true);
        try {
          const filePath = await downloadFile(
            url,
            filename,
            ext,
            true,
            setProgress,
          );
          setFilePath(filePath);
        } catch {
          SnackBar.show({
            title: getTranslation('downloadFileFailure'),
            duration: SnackBar.LENGTH_SHORT,
          });
        } finally {
          setLoading(false);
          setProgress(0);
        }
      }
    },
    [ext, filename, props.componentId, url],
  );

  useEffect(() => {
    const handle = Navigation.events().registerNavigationButtonPressedListener(
      listener,
    );
    return () => handle.remove();
  }, [listener]);

  useEffect(() => {
    if (filePath) {
      StatusBar.setBarStyle('default');
    }
  }, [filePath]);

  const isDarkMode = useDarkMode();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, isDarkMode, true);
  }, [isDarkMode, props.componentId]);

  useEffect(() => {
    StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  });

  return (
    <PaperProvider theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{flex: 1}}>
        {Platform.OS === 'android' && loading && (
          <ProgressBar progress={progress} color={Colors.theme} />
        )}
        {Platform.OS === 'ios' && !loading && (filePath ? true : false) && (
          <WebView
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
          />
        )}
        {Platform.OS === 'android' && (
          <View
            style={{
              flex: 1,
              backgroundColor: isDarkMode ? 'black' : 'white',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text
              style={[
                isDarkMode
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
              <IconButton
                icon="refresh"
                color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
                size={50}
                onPress={() => listener({buttonId: 'refresh'}) as any}
              />
              <IconButton
                disabled={loading || !filePath}
                icon="share"
                color={isDarkMode ? Colors.purpleDark : Colors.purpleLight}
                size={50}
                onPress={() => listener({buttonId: 'share'}) as any}
              />
            </View>
          </View>
        )}
        {Platform.OS === 'ios' &&
          loading &&
          (isDarkMode ? (
            <View
              style={{
                backgroundColor: 'black',
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              }}>
              <MediumPlaceholderDark style={{margin: 15}} loading={true} />
              <MediumPlaceholderDark style={{margin: 15}} loading={true} />
              <MediumPlaceholderDark style={{margin: 15}} loading={true} />
              <MediumPlaceholderDark style={{margin: 15}} loading={true} />
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
              <MediumPlaceholder style={{margin: 15}} loading={true} />
              <MediumPlaceholder style={{margin: 15}} loading={true} />
              <MediumPlaceholder style={{margin: 15}} loading={true} />
              <MediumPlaceholder style={{margin: 15}} loading={true} />
            </View>
          ))}
        {Platform.OS === 'ios' && loading && (
          <ProgressBar progress={progress} color={Colors.theme} />
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
