import { memo } from 'react';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { areRowPropsEqual } from 'helpers/rowProps';
import { CardWrapperProps } from './CardWrapper';

export interface ItemComponentProps<T> extends CardWrapperProps {
  data: T;
}

/**
 * What a row does, keyed by item. FilterList passes one object that keeps
 * its identity across renders, so rows only re-render when their own state
 * changes.
 */
export interface FilterListRowActions<T> {
  press: (item: T) => void;
  check: (id: string, checked: boolean) => void;
  /** The flags are the item's state now; each action toggles it. */
  fav: (item: T, isFav: boolean) => void;
  archive: (id: string, isArchived: boolean) => void;
  hide: (id: string, isHidden: boolean) => void;
  /** Moves a course one place, in reorder mode. */
  move: (id: string, offset: -1 | 1) => void;
}

interface FilterListRowProps<T extends { id: string }> {
  data: T;
  component: React.FC<ItemComponentProps<T>>;
  actions: FilterListRowActions<T>;
  /** Courses: rows can be hidden and dragged to reorder */
  isCourse: boolean;
  selectionMode: boolean;
  reorderMode: boolean;
  checked?: boolean;
  fav: boolean;
  archived: boolean;
  hidden: boolean;
  /** Reorder mode: whether the row isn't first / last */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  last?: boolean;
}

/** A row inside `ReorderableList`, the only place its drag handle exists. */
const ReorderableItem = <T,>({
  component: Component,
  ...props
}: ItemComponentProps<T> & {
  component: React.FC<ItemComponentProps<T>>;
}) => {
  const drag = useReorderableDrag();
  return <Component {...props} onDrag={drag} />;
};

const FilterListRow = <T extends { id: string }>({
  data,
  component: Component,
  actions,
  isCourse,
  selectionMode,
  reorderMode,
  checked,
  fav,
  archived,
  hidden,
  canMoveUp,
  canMoveDown,
  last,
}: FilterListRowProps<T>) => {
  const itemProps: ItemComponentProps<T> = {
    data,
    selectionMode,
    reorderMode,
    checked,
    onCheck: value => actions.check(data.id, value),
    onPress: () => actions.press(data),
    fav,
    onToggleFav: () => actions.fav(data, fav),
    archived,
    onToggleArchived: () => actions.archive(data.id, archived),
    hidden,
    onToggleHidden: isCourse ? () => actions.hide(data.id, hidden) : undefined,
    onMove: isCourse ? offset => actions.move(data.id, offset) : undefined,
    canMoveUp,
    canMoveDown,
    last,
  };
  return isCourse ? (
    <ReorderableItem component={Component} {...itemProps} />
  ) : (
    <Component {...itemProps} />
  );
};

export default memo(FilterListRow, areRowPropsEqual) as typeof FilterListRow;
