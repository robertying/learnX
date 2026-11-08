import { StyleSheet, View } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import Styles from 'constants/Styles';
import { Assignment } from 'data/types/state';
import { removeTags } from 'helpers/text';
import { deadlineText } from 'helpers/assignments';
import useMinute from 'hooks/useMinute';
import CardWrapper, { CardWrapperProps } from 'components/CardWrapper';
import Colors from 'constants/Colors';
import { Caption, Paragraph, Subheading, Title } from 'components/Text';

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
  const strippedDescription = removeTags(description);
  const now = useMinute();
  const dueText = deadlineText(deadline, now);

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
        {strippedDescription ? (
          <Paragraph numberOfLines={2}>{strippedDescription}</Paragraph>
        ) : null}
        <View style={Styles.flexRowCenter}>
          <Caption>{courseTeacherName}</Caption>
          <Caption>{dueText}</Caption>
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

export default AssignmentCard;
