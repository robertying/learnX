import { useNavigation } from '@react-navigation/native';
import { OpenTarget } from 'helpers/openTarget';
import { setPendingTarget } from 'hooks/usePendingTarget';

/**
 * Opens what a tapped notification, widget row or Spotlight result points
 * to: the item's detail, its list, or Today.
 */
const useOpenTarget = () => {
  const navigation = useNavigation();

  return (target: OpenTarget) => {
    if (target.type === 'today') {
      setPendingTarget(null);
      return navigation.navigate('MainTab', {
        screen: 'TodayStack',
        params: { screen: 'Today', pop: true },
      });
    }
    // The list opens the item, as a tap on it would, so it lands in the
    // detail pane of a split view and on top of the list on a phone.
    setPendingTarget(target.id ? target : null);
    switch (target.type) {
      case 'notice':
        return navigation.navigate('MainTab', {
          screen: 'NoticeStack',
          params: { screen: 'Notices', pop: true },
        });
      case 'assignment':
        return navigation.navigate('MainTab', {
          screen: 'AssignmentStack',
          params: { screen: 'Assignments', pop: true },
        });
      case 'file':
        return navigation.navigate('MainTab', {
          screen: 'FileStack',
          params: { screen: 'Files', pop: true },
        });
    }
  };
};

export default useOpenTarget;
