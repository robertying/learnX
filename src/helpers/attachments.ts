import mime from 'mime';
import type { RemoteFile } from '@robertying/thu-learn-lib';
import type { DownloadableFile } from 'data/types/state';
import { getExtension, stripExtension } from 'helpers/filename';

/**
 * File detail's `attachment` param for a notice's or an assignment's
 * attachment (or a file picked for a submission). It is downloaded under the
 * attachment's own id, so a replaced attachment with the same name is never
 * served from the old one's copy. The extension comes from `type` when the
 * file has one (a picked file), else from its name.
 */
export const attachmentFile = (
  course: { courseId: string; courseName: string },
  attachment: RemoteFile & { type?: string | null },
): DownloadableFile => ({
  id: attachment.id,
  courseId: course.courseId,
  courseName: course.courseName,
  title: stripExtension(attachment.name),
  downloadUrl: attachment.downloadUrl,
  fileType:
    (attachment.type
      ? mime.getExtension(attachment.type)
      : getExtension(attachment.name)) || '',
});
