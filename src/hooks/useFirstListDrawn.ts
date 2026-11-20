import { useEffect } from 'react';
import { markPerf } from 'services/perf';

/**
 * Marks the launch's first list drawn (`services/perf`) once `drawn` (the
 * screen on screen, with its content or its empty state, not a spinner),
 * after the frame that shows it.
 */
const useFirstListDrawn = (drawn: boolean) => {
  useEffect(() => {
    if (!drawn) {
      return;
    }
    const frame = requestAnimationFrame(() => markPerf('firstListDrawn'));
    return () => cancelAnimationFrame(frame);
  }, [drawn]);
};

export default useFirstListDrawn;
