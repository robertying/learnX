import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Caption, Paragraph, Title, Subheading} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import Colors from 'constants/Colors';
import {Notice} from 'data/types/state';
import {removeTags} from 'helpers/html';
import CardWrapper, {CardWrapperProps} from './CardWrapper';

export interface NoticeCardProps extends CardWrapperProps {
  data: Notice;
  hideCourseName?: boolean;
}

const NoticeCard: React.FC<React.PropsWithChildren<NoticeCardProps>> = ({
  data: {
    title,
    content,
    courseName,
    publisher,
    publishTime,
    markedImportant,
    hasRead,
    attachment,
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
            {attachment && (
              <Icon
                style={styles.icon}
                name="attachment"
                color={Colors.orange500}
                size={20}
              />
            )}
            {markedImportant && (
              <Icon
                style={styles.icon}
                name="flag"
                color={Colors.red500}
                size={20}
              />
            )}
            {!hasRead && (
              <Icon
                style={styles.icon}
                name="checkbox-blank-circle"
                color={Colors.blue500}
              />
            )}
          </View>
        </View>
        {removeTags(content) ? (
          <Paragraph numberOfLines={2}>{removeTags(content)}</Paragraph>
        ) : null}
        <View style={Styles.flexRowCenter}>
          <Caption>{publisher}</Caption>
          <Caption>{dayjs(publishTime).fromNow()}</Caption>
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

export default memo(NoticeCard);
