import type { CardAction } from 'helpers/cardActions';

export interface CardMenuProps {
  visible: boolean;
  actions: CardAction[];
  onAction: (action: CardAction) => void;
  onDismiss: () => void;
}
