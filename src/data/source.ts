import {Learn2018Helper, addCSRFTokenToUrl} from 'thu-learn-lib-no-native';
import mime from 'mime-types';
import axios from 'axios';

let dataSource = new Learn2018Helper();

const setCredentials = (username: string, password: string) => {
  dataSource = new Learn2018Helper({
    provider: () => ({
      username: username,
      password: password,
    }),
  });
};

const submitAssignmentUrl =
  'https://learn.tsinghua.edu.cn/b/wlxt/kczy/zy/student/tjzy';

const submitAssignment = async (
  studentHomeworkId: string,
  content?: string,
  attachment?: {
    uri: string;
    name: string;
  },
  onProgress?: (progress: number) => void,
  remove: boolean = false,
) => {
  if (!content && !attachment && !remove) {
    return;
  }

  const body = new FormData();
  body.append('xszyid', studentHomeworkId);
  body.append('zynr', content || '');
  body.append('isDeleted', remove ? 1 : 0);
  if (attachment) {
    body.append('fileupload', {
      uri: attachment.uri,
      name: attachment.name,
      type: mime.lookup(attachment.uri) || 'text/plain',
    });
  }

  try {
    await dataSource.login();
  } catch {}

  try {
    const csrfToken = dataSource.getCSRFToken();
    const url = addCSRFTokenToUrl(submitAssignmentUrl, csrfToken);
    const res = await axios.post(url, body, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: e => onProgress?.(e.total ? e.loaded / e.total : 0),
    });

    if (res.status !== 200) {
      throw new Error('Failed to submit the assignment: invalid login session');
    }
    if (res.data?.result === 'error') {
      throw new Error('Failed to submit the assignment: ' + res.data?.msg);
    }
  } catch {
    throw new Error('Failed to submit the assignment: unknown error');
  }
};

export {setCredentials, dataSource, submitAssignment};
