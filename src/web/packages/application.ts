import { bridge } from 'web/bridge';

/**
 * Stands in for expo-application in the Electron app: the version and build
 * number are the packaged app's (electron/buildInfo.ts), the same as the
 * mobile apps' for a release, and the id is the Electron app's.
 */
const info = (() => {
  try {
    return bridge().appInfo();
  } catch {
    return null;
  }
})();

export const nativeApplicationVersion: string | null = info?.version ?? null;
export const nativeBuildVersion: string | null = info?.build || null;
export const applicationId: string | null = 'io.robertying.learnXElectron';
export const applicationName: string | null = 'learnX';
