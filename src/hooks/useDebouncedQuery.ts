import { useEffect, useState } from 'react';

/**
 * `query` once it has stayed the same for `delay` ms, or right away when it
 * is cleared, so a list that follows typing doesn't change on every key and
 * a cleared field resets at once.
 */
export default function useDebouncedQuery(query: string, delay: number) {
  const [settled, setSettled] = useState(query);
  const cleared = !query.trim();
  useEffect(() => {
    if (cleared) {
      return;
    }
    const timer = setTimeout(() => setSettled(query), delay);
    return () => clearTimeout(timer);
  }, [query, delay, cleared]);
  return cleared ? query : settled;
}
