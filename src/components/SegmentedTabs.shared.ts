export interface SegmentedTabsProps {
  titles: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  accessibilityLabel?: string;
}
