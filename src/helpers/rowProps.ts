// Props comparison for FilterListRow's memo.

/** Whether two objects have the same own keys with identical values */
export const shallowEqual = (a: object, b: object) => {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a) as (keyof typeof a)[];
  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every(key => Object.is(a[key], b[key]))
  );
};

/**
 * Props comparison for a list row: shallow, except that the item is compared
 * by its fields, so a row whose item was rebuilt with the same values (a
 * course with recomputed counts) does not re-render.
 */
export const areRowPropsEqual = <P extends { data: object }>(
  prev: P,
  next: P,
) => {
  const { data: prevData, ...prevRest } = prev;
  const { data: nextData, ...nextRest } = next;
  return shallowEqual(prevData, nextData) && shallowEqual(prevRest, nextRest);
};
