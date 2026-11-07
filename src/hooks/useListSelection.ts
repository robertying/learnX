import { useLayoutEffect, useRef, useState } from 'react';
import { emptySelection, toggleAllSelection } from 'helpers/filterList';

/**
 * Multi-select state for a list: whether selection mode is on, which ids are
 * checked, and a ref to the latest selection for header buttons created
 * before it changed.
 */
const useListSelection = (items: { id: string }[]) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    emptySelection(items),
  );

  const selectionRef = useRef(selection);
  useLayoutEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const selectedCount = Object.values(selection).filter(Boolean).length;

  /** Turns selection mode on, or off and clears the selection */
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelection(emptySelection(items));
    }
    setSelectionMode(!selectionMode);
  };

  const checkAll = () => {
    setSelection(prev => toggleAllSelection(prev, items));
  };

  const setChecked = (id: string, checked: boolean) => {
    setSelection(prev => ({ ...prev, [id]: checked }));
  };

  return {
    selectionMode,
    selection,
    selectionRef,
    selectedCount,
    toggleSelectionMode,
    checkAll,
    setChecked,
  };
};

export default useListSelection;
