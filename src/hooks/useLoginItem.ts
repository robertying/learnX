/** Start at login's state, and a way to change it. */
export interface LoginItem {
  enabled: boolean;
  set: (value: boolean) => Promise<void>;
}

/**
 * Start at login, which only the Electron app offers
 * (useLoginItem.web.ts): never on the phones.
 */
const useLoginItem = (): LoginItem | null => null;

export default useLoginItem;
