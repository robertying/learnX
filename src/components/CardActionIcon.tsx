import { CardAction } from 'helpers/cardActions';
import SystemIcon from './SystemIcon';

/** A card action's icon */
const CardActionIcon: React.FC<{ action: CardAction; size: number }> = ({
  action: { icon, color },
  size,
}) => <SystemIcon name={icon} size={size} color={color} />;

export default CardActionIcon;
