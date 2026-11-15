import { useLayoutEffect, useRef } from 'react';

/**
 * A ref that holds `value` as of the last render, for a handler created
 * earlier (one handed to the header or to rows that don't re-render) to call
 * the current one. Read it only when the handler runs, never during render.
 */
const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
};

export default useLatest;
