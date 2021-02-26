import React, {memo} from 'react';
import {View} from 'react-native';
import {Subheading, Title} from 'react-native-paper';
import Styles from 'constants/Styles';
import {Course} from 'data/types/state';
import CardWrapper, {CardWrapperProps} from './CardWrapper';

export interface CourseCardProps extends CardWrapperProps {
  data: Course;
}

const CourseCard: React.FC<CourseCardProps> = ({
  data: {name, teacherName},
  ...restProps
}) => {
  return (
    <CardWrapper {...restProps}>
      <View style={Styles.flex1}>
        <Subheading numberOfLines={1}>{teacherName}</Subheading>
        <Title>{name}</Title>
      </View>
    </CardWrapper>
  );
};

export default memo(CourseCard);
