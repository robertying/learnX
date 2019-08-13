import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {iOSColors, iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import Text from './Text';

export interface IFileCardProps extends IInteractablePreviewWrapperProps {
  readonly title: string;
  readonly extension: string;
  readonly size: string;
  readonly date: string;
  readonly description?: string;
  readonly markedImportant: boolean;
  readonly courseName?: string;
  readonly courseTeacherName?: string;
}

const FileCard: React.FC<IFileCardProps> = props => {
  const {
    onPress,
    onPressIn,
    title,
    size,
    date,
    courseName,
    extension,
    courseTeacherName,
    markedImportant,
    pinned,
    onPinned,
    description,
    dragEnabled,
  } = props;

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      onPressIn={onPressIn}
      dragEnabled={dragEnabled}>
      <View
        style={{
          backgroundColor: '#fff',
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          borderLeftColor: Colors.theme,
          borderLeftWidth: pinned ? 10 : 0,
        }}>
        <View
          style={[
            styles.flexRow,
            {
              justifyContent: 'space-between',
            },
          ]}>
          <Text
            style={[
              {flex: 1},
              iOSUIKit.bodyEmphasized,
              Platform.OS === 'android' && {fontWeight: 'bold'},
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          <Text style={{fontSize: 13, marginLeft: 5}}>
            {extension.toUpperCase() + ' ' + size}
          </Text>
          {markedImportant && (
            <Icon
              style={{marginLeft: 5}}
              name="flag"
              size={18}
              color={iOSColors.red}
            />
          )}
        </View>
        <View
          style={{
            marginTop: 8,
          }}>
          <Text style={iOSUIKit.subhead} numberOfLines={3}>
            {description || getTranslation('noFileDescription')}
          </Text>
        </View>
        <View
          style={[
            styles.flexRow,
            {
              justifyContent: 'space-between',
              marginTop: 10,
            },
          ]}>
          <Text style={{color: iOSColors.gray, fontSize: 13}}>
            {courseName &&
              courseTeacherName &&
              `${courseTeacherName} / ${courseName} `}
          </Text>
          <Text style={{color: iOSColors.gray, fontSize: 13}}>
            {dayjs(date).fromNow()}
          </Text>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default FileCard;

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
