import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { CardAction } from 'helpers/cardActions';

/** A card action's icon, from its icon set */
const CardActionIcon: React.FC<{ action: CardAction; size: number }> = ({
  action: { icon, color },
  size,
}) =>
  icon.set === 'material' ? (
    <MaterialIcons name={icon.name} size={size} color={color} />
  ) : (
    <MaterialCommunityIcons name={icon.name} size={size} color={color} />
  );

export default CardActionIcon;
