import { StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import { File } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { useTheme } from 'theme';
import CardWrapper, { CardWrapperProps } from './CardWrapper';
import { Caption, Paragraph, Subheading, Headline } from 'components/Text';

export interface FileCardProps extends CardWrapperProps {
  data: File;
  hideCourseName?: boolean;
}

const FileCard: React.FC<React.PropsWithChildren<FileCardProps>> = ({
  data: {
    title,
    description,
    courseName,
    size,
    fileType,
    markedImportant,
    isNew,
    uploadTime,
    category,
  },
  hideCourseName,
  ...restProps
}) => {
  const theme = useTheme();
  const strippedDescription = removeTags(description);
  const timeAgo = dayjs(uploadTime).fromNow();

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
            {markedImportant ? (
              <Icon
                style={styles.icon}
                name="flag"
                color={theme.colors.status.red}
                size={20}
              />
            ) : null}
            {isNew ? (
              <Icon
                style={styles.icon}
                name="checkbox-blank-circle"
                color={theme.colors.status.blue}
              />
            ) : null}
          </View>
        </View>
        {strippedDescription ? (
          <Paragraph numberOfLines={2}>{strippedDescription}</Paragraph>
        ) : null}
        <View style={Styles.metaRow}>
          <Caption>
            {`${category?.title ?? ''} ${fileType?.toUpperCase() ?? ''} ${size}`.trim()}
          </Caption>
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

export default FileCard;
