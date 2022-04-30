import {SafeAreaView, SafeAreaViewProps} from 'react-native-safe-area-context';
import Styles from 'constants/Styles';

const SafeArea: React.FC<
  React.PropsWithChildren<SafeAreaViewProps>
> = props => {
  return (
    <SafeAreaView style={Styles.flex1} edges={['left', 'right']} {...props} />
  );
};

export default SafeArea;
