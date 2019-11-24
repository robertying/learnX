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
import {useDarkMode} from 'react-native-dark-mode';

export interface IAssignmentsViewProps {
  assignments: IAssignment[];
  isFetching: boolean;
  onAssignmentCardPress: (assignment: IAssignment) => void;
  onRefresh?: () => void;
}

const AssignmentsView: React.FunctionComponent<IAssignmentsViewProps> = props => {
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
        onPress={() => onAssignmentCardPress(item)}
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  const isDarkMode = useDarkMode();

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: isDarkMode ? 'black' : 'white'}}>
      <FlatList
        ListEmptyComponent={EmptyList}
        data={assignments}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[isDarkMode ? Colors.purpleDark : Colors.purpleLight]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default AssignmentsView;
