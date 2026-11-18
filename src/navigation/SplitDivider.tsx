import Divider from 'components/Divider';

export interface SplitDividerProps {
  /** The list column's width now. */
  width: number;
  /** The narrowest and widest it can be dragged to now. */
  min: number;
  max: number;
  /** The width a double click puts it back to. */
  defaultWidth: number;
  /** While dragging, with the new width. */
  onResize: (width: number) => void;
  /** Once a drag or a key press has settled on a width. */
  onResizeEnd: (width: number) => void;
}

/**
 * The line between the split view's list and detail columns. Android's
 * columns keep their widths; the Electron app's divider can be dragged
 * (`SplitDivider.web`).
 */
const SplitDivider: React.FC<SplitDividerProps> = () => <Divider vertical />;

export default SplitDivider;
