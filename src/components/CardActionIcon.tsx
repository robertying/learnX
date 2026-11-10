import { CardAction } from 'helpers/cardActions';
import { useTheme } from 'theme';
import SystemIcon from './SystemIcon';

/** A card action's icon, in its status hue */
const CardActionIcon: React.FC<{ action: CardAction; size: number }> = ({
  action: { icon, tone },
  size,
}) => {
  const theme = useTheme();
  return (
    <SystemIcon
      name={icon}
      size={size}
      color={theme.colors.onStatusContainer[tone]}
    />
  );
};

export default CardActionIcon;
