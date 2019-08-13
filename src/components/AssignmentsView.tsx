import React from 'react';
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import Colors from '../constants/Colors';
import {IAssignment} from '../redux/types/state';
import AssignmentCard from './AssignmentCard';
import EmptyList from './EmptyList';

export interface IAssignmentsViewProps {
  readonly assignments: ReadonlyArray<IAssignment>;
  readonly isFetching: boolean;
  readonly onAssignmentCardPress: (assignmentId: string) => void;
  readonly onRefresh?: () => void;
}

const AssignmentsView: React.FunctionComponent<
  IAssignmentsViewProps
> = props => {
  const {assignments, onAssignmentCardPress, isFetching, onRefresh} = props;

  const renderListItem: ListRenderItem<IAssignment> = ({item}) => {
    return (
      <AssignmentCard
        dragEnabled={false}
        title={item.title}
        date={item.deadline}
        description={item.description}
        hasAttachment={item.attachmentName ? true : false}
        submitted={item.submitted}
        graded={item.gradeTime ? true : false}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() => onAssignmentCardPress(item.id)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#f0f0f0'}}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={assignments}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.theme]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default AssignmentsView;
