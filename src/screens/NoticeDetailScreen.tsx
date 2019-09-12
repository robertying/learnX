import React, {useEffect} from 'react';
import {connect} from 'react-redux';
import NoticeBoard from '../components/NoticeBoard';
import {INavigationScreen} from '../types/NavigationScreen';
import {useDarkMode} from 'react-native-dark-mode';
import {Navigation} from 'react-native-navigation';

interface INoticeDetailScreenProps {
  readonly title: string;
  readonly author: string;
  readonly content: string;
  readonly publishTime: string;
  readonly attachmentName?: string;
  readonly attachmentUrl?: string;
}

const NoticeDetailScreen: INavigationScreen<
  INoticeDetailScreenProps
> = props => {
  const isDarkMode = useDarkMode();

  useEffect(() => {
    Navigation.mergeOptions(props.componentId, {
      topBar: {
        title: {
          color: isDarkMode ? 'white' : 'black',
        },
      },
    });
  }, [isDarkMode, props.componentId]);

  return <NoticeBoard {...props} />;
};

export default connect()(NoticeDetailScreen);
