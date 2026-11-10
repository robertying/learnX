import { useLayoutEffect, useRef, useState } from 'react';
import { checkedIds, toggleAllSelection } from 'helpers/filters';

/**
 * Multi-select state for a list: whether selection mode is on, which items are
 * checked, and a ref to the latest checked ids for header buttons created
 * before they changed. Only items still in `items` count as checked.
 */
const useListSelection = (items: { id: string }[]) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  const checked = checkedIds(selection, items);
  const checkedIdsRef = useRef(checked);
  useLayoutEffect(() => {
    checkedIdsRef.current = checked;
  }, [checked]);

  /** Turns selection mode on, or off and clears the selection */
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelection({});
    }
    setSelectionMode(!selectionMode);
  };

  const checkAll = () => {
    setSelection(prev => toggleAllSelection(prev, items));
  };

  const setChecked = (id: string, isChecked: boolean) => {
    setSelection(prev => ({ ...prev, [id]: isChecked }));
  };

  return {
    selectionMode,
    selection,
    checkedIdsRef,
    selectedCount: checked.length,
    toggleSelectionMode,
    checkAll,
    setChecked,
  };
};

export default useListSelection;
