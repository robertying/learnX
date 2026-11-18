import type { CardAction } from 'helpers/cardActions';

export interface CardMenuProps {
  visible: boolean;
  actions: CardAction[];
  onAction: (action: CardAction) => void;
  onDismiss: () => void;
  /**
   * Where the long press was, in the card's coordinates: Android's menu opens
   * there, as a View's context menu does, so it reads as the pressed card's.
   */
  anchor?: { x: number; y: number };
}
