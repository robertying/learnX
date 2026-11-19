import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { Text as FluentText, tokens } from '@fluentui/react-components';
import { fluentIcon } from 'web/fluentIcons';
import { t } from 'helpers/i18n';
import { sanitizeFileName } from 'helpers/filename';
import { bridge } from 'web/bridge';
import Spacing from 'constants/Spacing';
import type { FileDropTargetProps } from './FileDropTarget.shared';

/** Where dropped files are copied, under the cache, as picked ones are. */
const DROP_DIR = 'picked';

/**
 * How much of a dropped file is read and sent at a time: a lecture
 * recording of hundreds of MB never sits in the page whole, and the window
 * keeps responding while it copies.
 */
export const DROP_CHUNK_BYTES = 4 * 1024 * 1024;

const UploadIcon = fluentIcon('ArrowUploadRegular');

/** Whether a drag carries files (not text or a link). */
const hasFiles = (event: DragEvent) =>
  !!event.dataTransfer?.types.includes('Files');

/**
 * Copies a dropped file into the app's cache, where the submission reads
 * it, as the file picker does (electron/fileShell.ts), a piece at a time.
 */
export const copyDroppedFile = async (file: globalThis.File) => {
  const dir = new Directory(
    Paths.cache,
    DROP_DIR,
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
  );
  dir.create({ intermediates: true, idempotent: true });
  const name = sanitizeFileName(file.name);
  const target = new File(dir, name);
  try {
    target.writeSync(new Uint8Array());
    for (let start = 0; start < file.size; start += DROP_CHUNK_BYTES) {
      const piece = file.slice(start, start + DROP_CHUNK_BYTES);
      await bridge().files.append(
        target.uri,
        new Uint8Array(await piece.arrayBuffer()),
      );
    }
  } catch (error) {
    // A copy cut short (a full disk, a folder dropped) leaves nothing behind.
    try {
      dir.delete();
    } catch {}
    throw error;
  }
  return {
    uri: target.uri,
    name,
    type: file.type || null,
    size: file.size,
  };
};

/**
 * Takes a file dragged onto the screen from the file manager in the Electron
 * app: while one is over it, the screen says where it goes; dropped, it's
 * copied into the cache and becomes the attachment. One file at a time:
 * of several, the first is taken.
 */
const FileDropTarget = ({
  onDrop,
  onDropFailed,
  disabled = false,
  children,
}: FileDropTargetProps) => {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [over, setOver] = useState(false);

  const handleDrop = useEffectEvent(async (file: globalThis.File) => {
    try {
      onDrop(await copyDroppedFile(file));
    } catch {
      onDropFailed?.();
    }
  });
  const isDisabled = useEffectEvent(() => disabled);

  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node) {
      return;
    }
    // dragenter and dragleave fire for every child crossed: count them.
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event) || isDisabled()) {
        return;
      }
      event.preventDefault();
      depth += 1;
      setOver(true);
    };
    const overNode = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      // Without this the drop isn't allowed (and a file dropped elsewhere
      // would try to open in the window, which the main process refuses).
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = isDisabled() ? 'none' : 'copy';
      }
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setOver(false);
      }
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      depth = 0;
      setOver(false);
      const file = event.dataTransfer?.files[0];
      if (file && !isDisabled()) {
        void handleDrop(file);
      }
    };
    node.addEventListener('dragenter', enter);
    node.addEventListener('dragover', overNode);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragenter', enter);
      node.removeEventListener('dragover', overNode);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, []);

  return (
    <View ref={ref} style={styles.container} testID="file-drop-target">
      {children}
      {over ? (
        <View
          pointerEvents="none"
          testID="file-drop-overlay"
          style={[
            styles.overlay,
            {
              backgroundColor: tokens.colorBackgroundOverlay,
            },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: tokens.colorNeutralBackground1,
                borderColor: tokens.colorBrandStroke1,
                borderRadius: tokens.borderRadiusXLarge as never,
              },
            ]}
          >
            <UploadIcon
              fontSize={40}
              style={{ color: tokens.colorBrandForeground1 }}
            />
            <FluentText size={400} weight="semibold">
              {t('dropToAttach')}
            </FluentText>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.l,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.m,
    padding: Spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});

export default FileDropTarget;
