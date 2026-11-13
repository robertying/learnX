import { attachmentFile } from 'helpers/attachments';

const course = { courseId: 'c1', courseName: 'Calculus' };
const remote = {
  id: 'f1',
  name: 'report.docx',
  downloadUrl: 'https://learn.tsinghua.edu.cn/f1',
  previewUrl: '',
  size: '1 MB',
};

describe('attachmentFile', () => {
  it('keys the download by the attachment, not the notice or assignment', () => {
    expect(attachmentFile(course, remote)).toEqual({
      id: 'f1',
      courseId: 'c1',
      courseName: 'Calculus',
      title: 'report',
      downloadUrl: 'https://learn.tsinghua.edu.cn/f1',
      fileType: 'docx',
      size: '1 MB',
    });
  });

  it('leaves the size out when the attachment has none', () => {
    expect(attachmentFile(course, { ...remote, size: '' })).not.toHaveProperty(
      'size',
    );
  });

  it('takes the extension from the MIME type when there is one', () => {
    expect(
      attachmentFile(course, {
        ...remote,
        name: 'scan',
        type: 'application/pdf',
      }).fileType,
    ).toBe('pdf');
  });

  it('leaves the type empty when neither gives one', () => {
    expect(
      attachmentFile(course, {
        ...remote,
        name: 'scan',
        type: 'application/x-unknown-thing',
      }).fileType,
    ).toBe('');
  });
});
