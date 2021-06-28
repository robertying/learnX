import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Caption,
  Paragraph,
  Title,
  Colors,
  Subheading,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import {File} from 'data/types/state';
import {removeTags} from 'helpers/html';
import CardWrapper, {CardWrapperProps} from './CardWrapper';

export interface FileCardProps extends CardWrapperProps {
  data: File;
  hideCourseName?: boolean;
}

const FileCard: React.FC<FileCardProps> = ({
  data: {
    title,
    description,
    courseName,
    size,
    fileType,
    markedImportant,
    isNew,
    uploadTime,
  },
  hideCourseName,
  ...restProps
}) => {
  return (
    <CardWrapper {...restProps}>
      <View style={Styles.flex1}>
        <View style={Styles.flexRowCenter}>
          <View style={styles.title}>
            {hideCourseName ? null : (
              <Subheading numberOfLines={1}>{courseName}</Subheading>
            )}
            <Title numberOfLines={1}>{title}</Title>
          </View>
          <View style={[Styles.flexRowCenter, styles.icons]}>
            {markedImportant ? (
              <Icon
                style={styles.icon}
                name="flag"
                color={Colors.red500}
                size={20}
              />
            ) : null}
            {isNew ? (
              <Icon
                style={styles.icon}
                name="checkbox-blank-circle"
                color={Colors.blue500}
              />
            ) : null}
          </View>
        </View>
        {removeTags(description) ? (
          <Paragraph numberOfLines={2}>{removeTags(description)}</Paragraph>
        ) : null}
        <View style={Styles.flexRowCenter}>
          <Caption>{`${fileType?.toUpperCase() ?? ''} ${size}`}</Caption>
          <Caption>{dayjs(uploadTime).fromNow()}</Caption>
        </View>
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    flex: 10,
  },
  icons: {
    flex: 2,
    justifyContent: 'flex-end',
  },
  icon: {
    marginLeft: 6,
  },
});

export default memo(FileCard);
