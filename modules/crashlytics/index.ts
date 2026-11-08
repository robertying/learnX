import { requireOptionalNativeModule } from 'expo';

/** A parsed JS stack frame. Hermes bundles are one line, so the column matters. */
export interface StackFrame {
  symbol: string;
  file: string;
  line: number;
  column: number;
}

interface CrashlyticsModule {
  /**
   * Records a non-fatal report with the JS frames as its stack. It is sent on
   * the next launch, or with the crash when the app is about to crash.
   */
  recordError(name: string, message: string, frames: StackFrame[]): void;
  /** Adds a line to the logs sent with the next report. */
  log(message: string): void;
  /** Sets a key on every later report, native crashes included. */
  setCustomKey(key: string, value: string): void;
}

/**
 * The Firebase Crashlytics SDK the app already links natively. Null when the
 * native module isn't in the binary (e.g. Jest, or JS from Metro running in an
 * app built before it was added), so reporting is skipped instead of crashing.
 */
export default requireOptionalNativeModule<CrashlyticsModule>('Crashlytics');
