import { bridge } from 'web/bridge';

/**
 * Stands in for expo-document-picker in the Electron app: the system's open
 * dialog in the main process (electron/fileShell.ts), which copies the
 * picked file into the app's cache, as `copyToCacheDirectory` does.
 */

export interface DocumentPickerAsset {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  lastModified?: number;
}

export type DocumentPickerResult =
  | { canceled: true; assets: null }
  | { canceled: false; assets: DocumentPickerAsset[] };

export const getDocumentAsync = async ({
  multiple = false,
}: {
  multiple?: boolean;
  copyToCacheDirectory?: boolean;
} = {}): Promise<DocumentPickerResult> => {
  const picked = await bridge().shell.pickFiles({ multiple });
  if (!picked) {
    return { canceled: true, assets: null };
  }
  return {
    canceled: false,
    assets: picked.map(file => ({
      uri: file.uri,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType ?? undefined,
    })),
  };
};
