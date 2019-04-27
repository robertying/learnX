declare type Dimensions =
  | "REAL_WINDOW_HEIGHT"
  | "REAL_WINDOW_WIDTH"
  | "STATUS_BAR_HEIGHT"
  | "SOFT_MENU_BAR_HEIGHT"
  | "SMART_BAR_HEIGHT";

declare interface ExtraDimensions {
  readonly get: (dim: Dimensions) => number;
  readonly getRealWindowHeight: () => number;
  readonly getRealWindowWidth: () => number;
  readonly getStatusBarHeight: () => number;
  readonly getSoftMenuBarHeight: () => number;
  readonly getSmartBarHeight: () => number;
  readonly isSoftMenuBarEnabled: () => number;
}

declare module "react-native-extra-dimensions-android" {
  const instance: ExtraDimensions;
  export = instance;
}
