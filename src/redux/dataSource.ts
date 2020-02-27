import {Learn2018Helper} from 'thu-learn-lib-no-native';
import mime from 'mime-types';

let dataSource = new Learn2018Helper();

const setCredentials = (username: string, password: string) => {
  dataSource = new Learn2018Helper({
    provider: () => ({
      username: username!,
      password: password!,
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
    const res = await fetch(submitAssignmentUrl, {
      method: 'POST',
      body,
    });
    if (!res.ok) {
      throw new Error('Sumbit assignment failed');
    }
  } catch {
    throw new Error('Sumbit assignment failed');
  }
};

export {setCredentials, dataSource, submitAssignment};
