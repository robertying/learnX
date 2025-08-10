import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Caption, Paragraph, Title, Subheading } from 'react-native-paper';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import dayjs from 'dayjs';
import Styles from 'constants/Styles';
import { Assignment } from 'data/types/state';
import { removeTags } from 'helpers/html';
import { isLocaleChinese } from 'helpers/i18n';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import Colors from 'constants/Colors';

export interface AssignmentCardProps extends CardWrapperProps {
  data: Assignment;
  hideCourseName?: boolean;
}

const AssignmentCard: React.FC<
  React.PropsWithChildren<AssignmentCardProps>
> = ({
  data: {
    courseName,
    courseTeacherName,
    title,
    description,
    deadline,
    attachment,
    submitted,
    graded,
    answerContent,
    answerAttachment,
    excellentHomeworkList,
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
              <MaterialCommunityIcons
                name="attachment"
                color={Colors.orange500}
                size={20}
              />
            )}
            {submitted && (
              <MaterialCommunityIcons
                style={styles.icon}
                name="check"
                color={Colors.green500}
                size={20}
              />
            )}
            {graded && (
              <MaterialIcons
                style={styles.icon}
                name="grade"
                color={Colors.red500}
                size={18}
              />
            )}
            {(answerContent || answerAttachment) && (
              <MaterialCommunityIcons
                style={styles.icon}
                name="key-variant"
                color={Colors.blue500}
                size={16}
              />
            )}
            {(excellentHomeworkList ?? []).length > 0 && (
              <MaterialCommunityIcons
                style={styles.icon}
                name="medal"
                color={Colors.yellow500}
                size={16}
              />
            )}
          </View>
        </View>
        {removeTags(description) ? (
          <Paragraph numberOfLines={2}>{removeTags(description)}</Paragraph>
        ) : null}
        <View style={Styles.flexRowCenter}>
          <Caption>{courseTeacherName}</Caption>
          <Caption>
            {isLocaleChinese()
              ? dayjs().isAfter(dayjs(deadline))
                ? dayjs().to(dayjs(deadline)) + '截止'
                : '还剩 ' + dayjs().to(dayjs(deadline), true)
              : dayjs().isAfter(dayjs(deadline))
                ? 'closed ' + dayjs().to(dayjs(deadline))
                : 'due in ' + dayjs().to(dayjs(deadline), true)}
          </Caption>
        </View>
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    flex: 9,
  },
  icons: {
    flex: 3,
    justifyContent: 'flex-end',
  },
  icon: {
    marginLeft: 6,
  },
});

export default memo(AssignmentCard);
