import { CardAction } from 'helpers/cardActions';

export interface CardMenuProps {
  visible: boolean;
  actions: CardAction[];
  onAction: (action: CardAction) => void;
  onDismiss: () => void;
}

/** Android's long-press menu for a card (CardMenu.android.tsx); iOS uses swipe actions. */
const CardMenu: React.FC<CardMenuProps> = () => null;

export default CardMenu;
