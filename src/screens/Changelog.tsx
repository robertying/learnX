import {useEffect, useRef} from 'react';
import {Linking} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import WebView, {WebViewNavigation} from 'react-native-webview';
import {useDispatch} from 'react-redux';
import SafeArea from 'components/SafeArea';
import {setSetting} from 'data/actions/settings';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import {ScreenParams} from './types';
import packageJson from '../../package.json';

const Changelog: React.FC<StackScreenProps<ScreenParams, 'Changelog'>> =
  props => {
    const dispatch = useDispatch();

    const webViewRef = useRef<WebView>(null);

    const onNavigationStateChange = (e: WebViewNavigation) => {
      if (e.navigationType === 'click') {
        if (webViewRef.current) {
          webViewRef.current.stopLoading();
        }
        Linking.openURL(e.url);
      }
    };

    useNavigationAnimation(props);

    useEffect(() => {
      dispatch(setSetting('lastShowChangelogVersion', packageJson.version));
    }, [dispatch]);

    return (
      <SafeArea>
        <WebView
          ref={webViewRef}
          originWhitelist={['https://github.com']}
          onNavigationStateChange={onNavigationStateChange}
          decelerationRate="normal"
          androidHardwareAccelerationDisabled={true}
          source={{
            uri: 'https://github.com/robertying/learnX/releases',
          }}
          style={{backgroundColor: 'transparent'}}
        />
      </SafeArea>
    );
  };

export default Changelog;
