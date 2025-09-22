import { StyleSheet } from 'react-native';
import {
  IconButton as PaperIconButton,
  IconButtonProps,
} from 'react-native-paper';

const IconButton: React.FC<IconButtonProps> = ({ style, ...props }) => {
  return <PaperIconButton {...props} style={[styles.iconButton, style]} />;
};

export default IconButton;

const styles = StyleSheet.create({
  iconButton: {
    marginVertical: -2,
    marginHorizontal: 0,
    transform: [{ scale: 0.8 }],
  },
});
