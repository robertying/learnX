/**
 * Where a long press was in the card, for Android's card menu: from the
 * touch's page position and the card's box on screen. The touch's own
 * `locationX/Y` won't do, as they're in the coordinates of whichever child
 * the finger is on (a title, an icon).
 */
export const cardMenuAnchor = (
  touch: { pageX: number; pageY: number } | undefined,
  box: { left: number; top: number } | undefined,
): { x: number; y: number } | undefined =>
  touch && box && Number.isFinite(touch.pageX) && Number.isFinite(touch.pageY)
    ? { x: touch.pageX - box.left, y: touch.pageY - box.top }
    : undefined;
