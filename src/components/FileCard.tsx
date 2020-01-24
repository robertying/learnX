import React from 'react';
import {Platform, StyleSheet, View, Text} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';
import dayjs from '../helpers/dayjs';
import {getTranslation} from '../helpers/i18n';
import InteractablePreviewWrapper, {
  IInteractablePreviewWrapperProps,
} from './InteractablePreviewWrapper';
import {useColorScheme} from 'react-native-appearance';

export interface IFileCardProps extends IInteractablePreviewWrapperProps {
  title: string;
  extension: string;
  size: string;
  date: string;
  description?: string;
  markedImportant: boolean;
  courseName?: string;
  courseTeacherName?: string;
}

const styles = StyleSheet.create({
  root: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
  },
});

const FileCard: React.FC<IFileCardProps> = props => {
  const {
    onPress,
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
    fav,
    onFav,
    onRemind,
  } = props;

  const colorScheme = useColorScheme();

  return (
    <InteractablePreviewWrapper
      pinned={pinned}
      onPinned={onPinned}
      onPress={onPress}
      fav={fav}
      onFav={onFav}
      onRemind={onRemind}
      dragEnabled={dragEnabled}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: Colors.system('background', colorScheme),
            borderLeftColor: Colors.system('purple', colorScheme),
            borderLeftWidth: pinned ? 10 : 0,
          },
        ]}>
        <View style={styles.flexRow}>
          <Text
            style={[
              colorScheme === 'dark'
                ? iOSUIKit.bodyEmphasizedWhite
                : iOSUIKit.bodyEmphasized,
              styles.title,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          <Text style={{fontSize: 13, marginLeft: 5}}>
            {(extension ? extension.toUpperCase() + ' ' : '') + size}
          </Text>
          {markedImportant && (
            <Icon
              style={{marginLeft: 5}}
              name="flag"
              size={18}
              color={Colors.system('red', colorScheme)}
            />
          )}
        </View>
        <View
          style={{
            marginTop: 8,
          }}>
          <Text
            style={
              colorScheme === 'dark' ? iOSUIKit.subheadWhite : iOSUIKit.subhead
            }
            numberOfLines={3}>
            {description || getTranslation('noFileDescription')}
          </Text>
        </View>
        <View
          style={[
            styles.flexRow,
            {
              marginTop: 10,
            },
          ]}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              flex: 1,
              color: Colors.system('gray', colorScheme),
              fontSize: 13,
            }}>
            {courseName &&
              courseTeacherName &&
              `${courseTeacherName} / ${courseName} `}
          </Text>
          <Text
            style={{
              color: Colors.system('gray', colorScheme),
              fontSize: 13,
            }}>
            {dayjs(date).fromNow()}
          </Text>
        </View>
      </View>
    </InteractablePreviewWrapper>
  );
};

export default FileCard;
