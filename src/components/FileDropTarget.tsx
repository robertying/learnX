import type { FileDropTargetProps } from './FileDropTarget.shared';

/**
 * Takes a file dragged onto the screen in the Electron app
 * (`FileDropTarget.web.tsx`); the phone has no drag and drop here, so this
 * only draws its children.
 */
const FileDropTarget = ({ children }: FileDropTargetProps) => <>{children}</>;

export default FileDropTarget;
