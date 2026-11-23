import { requireOptionalNativeModule } from 'expo';

/**
 * Whether the system lets the background sync run: `on`; `off`, turned off
 * in the system settings (iOS: Background App Refresh; Android: background
 * battery use restricted); `lowPower`, paused by Low Power Mode (iOS);
 * `managed`, not allowed on this device by Screen Time or device management
 * (iOS).
 */
export type BackgroundRefreshState = 'on' | 'off' | 'lowPower' | 'managed';

interface BackgroundRefreshModule {
  getState(): Promise<BackgroundRefreshState>;
}

/**
 * Null where the native module isn't in the binary (Jest, the Electron app,
 * or JS from Metro in an app built before it was added).
 */
export default requireOptionalNativeModule<BackgroundRefreshModule>(
  'BackgroundRefresh',
);
