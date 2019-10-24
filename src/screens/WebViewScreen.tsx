import React, {useEffect, useState, useRef, useCallback} from 'react';
import {ProgressViewIOS, View} from 'react-native';
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

export interface IWebViewScreenStateProps {
  filename: string;
  url: string;
  ext: string;
}

export type IWebViewScreenProps = IWebViewScreenStateProps;

const WebViewScreen: INavigationScreen<IWebViewScreenProps> = props => {
  const {url, ext, filename} = props;

  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [progress, setProgress] = useState(0);

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
                    systemItem: fullScreen ? 'fastForward' : 'rewind',
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

  const isDarkMode = useDarkMode();

  return (
    <>
      <WebView
        style={{backgroundColor: 'transparent'}}
        source={{
          uri: filePath,
        }}
        originWhitelist={['*']}
        decelerationRate="normal"
      />
      {loading &&
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
      {loading && (
        <ProgressViewIOS
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: [{scaleX: 1.0}, {scaleY: 3}],
          }}
          progressTintColor={Colors.theme}
          progress={progress}
        />
      )}
    </>
  );
};

WebViewScreen.options = {
  topBar: {
    hideOnScroll: true,
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
            systemItem: 'rewind',
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
};

export default WebViewScreen;
