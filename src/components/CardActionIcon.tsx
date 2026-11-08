import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { CardAction } from 'helpers/cardActions';

/** A card action's icon */
const CardActionIcon: React.FC<{ action: CardAction; size: number }> = ({
  action: { icon, color },
  size,
}) => <MaterialCommunityIcons name={icon} size={size} color={color} />;

export default CardActionIcon;
