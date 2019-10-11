import React, {useEffect, useState, useRef} from 'react';
import {ProgressViewIOS, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {WebView} from 'react-native-webview';
import MediumPlaceholder from '../components/MediumPlaceholder';
import MediumPlaceholderDark from '../components/MediumPlaceholderDark';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {downloadFile, shareFile} from '../helpers/share';
import {showToast} from '../helpers/toast';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode, initialMode} from 'react-native-dark-mode';
import DeviceInfo from '../constants/DeviceInfo';
import {IPersistAppState} from '../redux/types/state';
import {connect} from 'react-redux';

export interface IWebViewScreenStateProps {
  readonly filename: string;
  readonly url: string;
  readonly ext: string;
  compactWidth?: boolean;
  pushed?: boolean;
}

type IWebViewScreenProps = IWebViewScreenStateProps;

const WebViewScreen: INavigationScreen<IWebViewScreenProps> = props => {
  const {url, ext, filename, compactWidth, pushed} = props;

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
        showToast(getTranslation('downloadFileFailure'), 1500);
      } finally {
        setLoading(false);
        setProgress(0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullScreenRef = useRef<boolean>(false);

  useEffect(() => {
    const listener = Navigation.events().registerNavigationButtonPressedListener(
      async ({buttonId}) => {
        if (buttonId === 'toggle') {
          const fullScreen = fullScreenRef.current!;
          Navigation.mergeOptions(props.componentId, {
            splitView: {
              displayMode: fullScreen ? 'visible' : 'hidden',
            },
            topBar: {
              leftButtons: pushed
                ? []
                : [
                    {
                      id: 'toggle',
                      systemItem: fullScreen ? 'rewind' : 'fastForward',
                    },
                  ],
            },
          });
          fullScreenRef.current = !fullScreen;
        }
        if (buttonId === 'share') {
          showToast(getTranslation('preparingFile'), 1500);
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
            showToast(getTranslation('downloadFileFailure'), 1500);
          } finally {
            setLoading(false);
            setProgress(0);
          }
        }
      },
    );
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pushed) {
      Navigation.mergeOptions(props.componentId, {
        topBar: {
          leftButtons: compactWidth
            ? []
            : [
                {
                  id: 'toggle',
                  systemItem: 'rewind',
                },
              ],
        },
      });
    }
  }, [compactWidth, props.componentId, pushed]);

  const isDarkMode = useDarkMode();

  useEffect(() => {
    const tabIconDefaultColor = isDarkMode ? Colors.grayDark : Colors.grayLight;
    const tabIconSelectedColor = isDarkMode ? Colors.purpleDark : Colors.theme;

    Navigation.mergeOptions(props.componentId, {
      layout: {
        backgroundColor: isDarkMode ? 'black' : 'white',
      },
      topBar: {
        title: {
          component: {
            name: 'navigation.title',
            passProps: {
              pushed,
              children: props.filename,
              style: {
                fontSize: 17,
                fontWeight: '500',
                color: isDarkMode ? 'white' : 'black',
              },
            },
          },
        },
      },
      bottomTab: {
        textColor: tabIconDefaultColor,
        selectedTextColor: tabIconSelectedColor,
        iconColor: tabIconDefaultColor,
        selectedIconColor: tabIconSelectedColor,
      },
    });
  }, [isDarkMode, props.componentId, props.filename, pushed]);

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

// tslint:disable-next-line: no-object-mutation
WebViewScreen.options = {
  layout: {
    backgroundColor: initialMode === 'dark' ? 'black' : 'white',
  },
  topBar: {
    hideOnScroll: true,
    leftButtons: DeviceInfo.isIPad()
      ? [
          {
            id: 'toggle',
            systemItem: 'rewind',
          },
        ]
      : undefined,
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

function mapStateToProps(state: IPersistAppState) {
  return {
    compactWidth: state.settings.compactWidth,
  };
}

export default connect(
  mapStateToProps,
  undefined,
)(WebViewScreen);
