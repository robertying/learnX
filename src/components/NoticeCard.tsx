import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import { Notice } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { Caption, Paragraph, Subheading, Headline } from 'components/Text';

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
  const theme = useTheme();
  const strippedContent = removeTags(content);
  const timeAgo = dayjs(publishTime).fromNow();

  return (
    <CardWrapper {...restProps}>
      <View style={Styles.flex1}>
        <View style={Styles.flexRowCenter}>
          <View style={styles.title}>
            {hideCourseName ? null : (
              <Subheading numberOfLines={1}>{courseName}</Subheading>
            )}
            <Headline numberOfLines={1}>{title}</Headline>
          </View>
          <View style={[Styles.flexRowCenter, styles.icons]}>
            {attachment && (
              <Icon
                style={styles.icon}
                name="attachment"
                color={theme.colors.status.orange}
                size={20}
              />
            )}
            {markedImportant && (
              <Icon
                style={styles.icon}
                name="flag"
                color={theme.colors.status.red}
                size={20}
              />
            )}
            {!hasRead && (
              <Icon
                style={styles.icon}
                name="checkbox-blank-circle"
                color={theme.colors.status.blue}
              />
            )}
          </View>
        </View>
        {strippedContent ? (
          <Paragraph numberOfLines={2}>{strippedContent}</Paragraph>
        ) : null}
        <View style={Styles.metaRow}>
          <Caption>{publisher}</Caption>
          <Caption>{timeAgo}</Caption>
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

export default NoticeCard;
