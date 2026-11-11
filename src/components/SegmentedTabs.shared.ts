export interface SegmentedTabsProps {
  titles: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accessibilityLabel?: string;
  /**
   * iOS 26 and later: a capsule of Liquid Glass with no bar behind it, for
   * tabs that float over the content scrolling under them.
   */
  floating?: boolean;
}
