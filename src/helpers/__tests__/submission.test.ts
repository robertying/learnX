import { submitAssignment } from 'data/source';
import {
  PickedAttachment,
  attachmentForFileDetail,
  canSubmit,
  defaultAttachmentName,
  initialSubmissionContent,
  pickedAsRemoteFile,
  sanitizeCustomAttachmentName,
  sendSubmission,
  submissionHtml,
  uploadAttachment,
} from 'helpers/submission';

jest.mock('data/source', () => ({ submitAssignment: jest.fn() }));

const picked: PickedAttachment = {
  uri: 'file:///tmp/scan.pdf',
  type: 'application/pdf',
  name: 'scan.pdf',
  size: 2048,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initialSubmissionContent', () => {
  it('strips tags and the stray comment end', () => {
    expect(initialSubmissionContent('<p>My <b>answer</b></p>-->')).toBe(
      'My answer',
    );
    expect(initialSubmissionContent(undefined)).toBe('');
  });
});

describe('defaultAttachmentName', () => {
  it('names the file after the assignment, by locale', () => {
    expect(defaultAttachmentName('HW1', 'image/jpeg', false)).toBe(
      'HW1 Submission.jpg',
    );
    expect(defaultAttachmentName('HW1', 'image/png', true)).toBe(
      'HW1-提交.png',
    );
  });

  it('falls back to a binary extension', () => {
    expect(defaultAttachmentName('HW1', null, false)).toBe(
      'HW1 Submission.bin',
    );
  });
});

describe('sanitizeCustomAttachmentName', () => {
  it('drops every dot', () => {
    expect(sanitizeCustomAttachmentName('final.v2.pdf')).toBe('finalv2pdf');
  });
});

describe('uploadAttachment', () => {
  it('is undefined without a picked file', () => {
    expect(uploadAttachment(null, 'name')).toBeUndefined();
  });

  it('keeps the picked name when no custom name is given', () => {
    expect(uploadAttachment(picked, '  ')).toEqual({
      uri: picked.uri,
      name: 'scan.pdf',
    });
  });

  it('renames with the picked extension', () => {
    expect(uploadAttachment(picked, ' Final ')).toEqual({
      uri: picked.uri,
      name: 'Final.pdf',
    });
  });
});

describe('canSubmit', () => {
  const base = {
    uploading: false,
    removeAttachment: false,
    content: '',
    picked: null,
  };

  it('needs content, a file or a removal', () => {
    expect(canSubmit(base)).toBe(false);
    expect(canSubmit({ ...base, content: 'x' })).toBe(true);
    expect(canSubmit({ ...base, picked })).toBe(true);
    expect(canSubmit({ ...base, removeAttachment: true })).toBe(true);
  });

  it('is off while uploading', () => {
    expect(canSubmit({ ...base, content: 'x', uploading: true })).toBe(false);
  });
});

describe('sendSubmission', () => {
  const onProgress = jest.fn();
  const attachment = { uri: picked.uri, name: 'scan.pdf' };

  it('keeps the answer when removing the attachment, as the website does', async () => {
    await sendSubmission({
      studentHomeworkId: 'hw',
      content: 'my answer',
      submittedContent: '<p>my answer</p>',
      removeAttachment: true,
      onProgress,
    });
    expect(submitAssignment).toHaveBeenCalledWith('hw', {
      content: '<p>my answer</p>',
      attachment: undefined,
      onProgress,
      remove: true,
    });
  });

  it('sends content and the attachment', async () => {
    await sendSubmission({
      studentHomeworkId: 'hw',
      content: 'answer',
      attachment,
      removeAttachment: false,
      onProgress,
    });
    expect(submitAssignment).toHaveBeenCalledWith('hw', {
      content: '<p>answer</p>',
      attachment: attachment,
      onProgress,
      remove: false,
    });
  });

  it('sends nothing when there is nothing to send', async () => {
    await sendSubmission({
      studentHomeworkId: 'hw',
      content: '',
      removeAttachment: false,
      onProgress,
    });
    expect(submitAssignment).not.toHaveBeenCalled();
  });

  it('passes failures on', async () => {
    jest.mocked(submitAssignment).mockRejectedValueOnce(new Error('Network'));
    await expect(
      sendSubmission({
        studentHomeworkId: 'hw',
        content: 'answer',
        removeAttachment: false,
        onProgress,
      }),
    ).rejects.toThrow('Network');
  });
});

describe('file detail params', () => {
  const assignment = { id: 'a1', courseName: 'Calculus' };

  it('opens a picked file by its MIME type', () => {
    const remote = pickedAsRemoteFile(picked);
    expect(remote).toEqual({
      id: '0000',
      name: 'scan.pdf',
      downloadUrl: picked.uri,
      previewUrl: picked.uri,
      size: '2048B',
      type: 'application/pdf',
    });
    expect(attachmentForFileDetail(assignment, remote)).toEqual({
      id: 'a1',
      courseName: 'Calculus',
      title: 'scan',
      downloadUrl: picked.uri,
      fileType: 'pdf',
    });
  });

  it('falls back to the extension for submitted files', () => {
    expect(
      attachmentForFileDetail(assignment, {
        id: 'f',
        name: 'report.docx',
        downloadUrl: 'https://example.com/f',
        previewUrl: '',
        size: '',
      }).fileType,
    ).toBe('docx');
    expect(pickedAsRemoteFile({ ...picked, size: 0 }).size).toBe('');
  });
});

describe('submissionHtml', () => {
  it('sends an edited answer as HTML, one paragraph per line', () => {
    expect(submissionHtml('first line\n\n<b> & "quotes"')).toBe(
      '<p>first line</p><p>&nbsp;</p><p>&lt;b&gt; &amp; &quot;quotes&quot;</p>',
    );
  });

  it('sends the submitted HTML back as it is when the answer was not edited', () => {
    const submitted = '<p>Answer with <strong>bold</strong> text</p>';
    expect(submissionHtml('Answer with bold text', submitted)).toBe(submitted);
    expect(submissionHtml('Changed', submitted)).toBe('<p>Changed</p>');
  });

  it('sends nothing for an empty answer', () => {
    expect(submissionHtml('  ')).toBe('');
    expect(submissionHtml('')).toBe('');
  });
});
