import {useContext} from 'react';
import {SplitViewContext} from 'components/SplitView';

const useDetailNavigator = () => {
  const context = useContext(SplitViewContext);

  return context.detailNavigationContainerRef?.current;
};

export default useDetailNavigator;
