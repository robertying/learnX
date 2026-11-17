/**
 * A note that learnX runs without Chromium's sandbox, which only the
 * Electron app can (useSandboxNote.web.ts): never on the phones.
 */
const useSandboxNote = (): string | null => null;

export default useSandboxNote;
