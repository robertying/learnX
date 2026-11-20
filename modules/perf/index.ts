import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class PerfModule extends NativeModule {
  /**
   * Reports the launch's first screen fully drawn (`Activity.reportFullyDrawn`):
   * Android keeps the first report of a launch.
   */
  reportFullyDrawn(): Promise<void>;
}

/**
 * Startup reporting on Android (`services/perf`). Null on iOS, the Mac and
 * the Electron app, in Jest and in an app built before the module was added.
 */
export default requireOptionalNativeModule<PerfModule>('LearnXPerf');
