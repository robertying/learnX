import React from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";
import { IAssignment, ICourse } from "../redux/types/state";
import AssignmentCard from "./AssignmentCard";
import Divider from "./Divider";

export interface IAssignmentsViewProps {
  readonly courses?: ReadonlyArray<ICourse>;
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetching: boolean;
  readonly onAssignmentCardPress: (assignmentId: string) => void;
  readonly onRefresh?: () => void;
  readonly pinnedAssignments?: readonly string[];
  readonly onPinned?: (pin: boolean, assignmentId: string) => void;
}

const AssignmentsView: React.FunctionComponent<
  IAssignmentsViewProps
> = props => {
  const {
    assignments: rawAssignments,
    onAssignmentCardPress,
    courses,
    isFetching,
    onRefresh,
    onPinned
  } = props;

  const pinnedAssignments = props.pinnedAssignments || [];

  const assignments: ReadonlyArray<IAssignment> = [
    ...rawAssignments.filter(item => pinnedAssignments.includes(item.id)),
    ...rawAssignments.filter(item => !pinnedAssignments.includes(item.id))
  ];

  const renderListItem: ListRenderItem<IAssignment> = ({ item }) => {
    if (courses) {
      const course = courses.find(course => course.id === item.courseId);
      if (course) {
        return (
          <AssignmentCard
            loading={isFetching}
            title={item.title}
            attachment={item.attachmentName}
            date={item.deadline}
            courseName={course.name}
            courseTeacherName={course.teacherName}
            pinned={pinnedAssignments.includes(item.id)}
            // tslint:disable-next-line: jsx-no-lambda
            onPinned={pin => onPinned!(pin, item.id)}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() => onAssignmentCardPress(item.id)}
          />
        );
      }
    }
    return (
      <AssignmentCard
        loading={isFetching}
        title={item.title}
        attachment={item.attachmentName}
        date={item.deadline}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => onAssignmentCardPress(item.id)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        ItemSeparatorComponent={Divider}
        data={assignments}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.tint]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default AssignmentsView;
