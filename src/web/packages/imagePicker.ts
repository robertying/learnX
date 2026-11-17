import { bridge } from 'web/bridge';

/**
 * Stands in for expo-image-picker in the Electron app: the system's open
 * dialog for pictures and videos (electron/fileShell.cjs), copied into the
 * app's cache. There's no camera.
 */

export interface ImagePickerAsset {
  uri: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width: number;
  height: number;
}

export type ImagePickerResult =
  | { canceled: true; assets: null }
  | { canceled: false; assets: ImagePickerAsset[] };

export const launchImageLibraryAsync = async ({
  allowsMultipleSelection = false,
}: {
  allowsMultipleSelection?: boolean;
  mediaTypes?: unknown;
  quality?: number;
} = {}): Promise<ImagePickerResult> => {
  const picked = await bridge().shell.pickFiles({
    images: true,
    multiple: allowsMultipleSelection,
  });
  if (!picked) {
    return { canceled: true, assets: null };
  }
  return {
    canceled: false,
    assets: picked.map(file => ({
      uri: file.uri,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType ?? undefined,
      width: 0,
      height: 0,
    })),
  };
};

export const launchCameraAsync = async (): Promise<ImagePickerResult> => ({
  canceled: true,
  assets: null,
});
