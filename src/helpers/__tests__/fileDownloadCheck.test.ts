import { fileDownloadCheckUrl } from '../fileDownloadCheck';

describe('fileDownloadCheckUrl', () => {
  it('answers the download check for a course file', () => {
    expect(
      fileDownloadCheckUrl(
        'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=abc123',
      ),
    ).toBe(
      'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFileBefore?wjid=abc123',
    );
  });

  it('answers null for other files', () => {
    expect(
      fileDownloadCheckUrl(
        'https://learn.tsinghua.edu.cn/b/wlxt/kczy/zy/student/downloadFile/abc/def',
      ),
    ).toBeNull();
    expect(
      fileDownloadCheckUrl(
        'https://learn.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0',
      ),
    ).toBeNull();
    expect(fileDownloadCheckUrl('https://example.com/sample.pdf')).toBeNull();
    expect(fileDownloadCheckUrl('not a url')).toBeNull();
  });
});
