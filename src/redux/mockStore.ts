import {dummyPassword, dummyUsername} from '../constants/Dummy';
import {IPersistAppState, Entity} from './types/state';

const mockStore: IPersistAppState = {
  auth: {
    loggingIn: false,
    loggedIn: true,
    username: dummyUsername,
    password: dummyPassword,
    _persist: {
      rehydrated: true,
      version: -1,
    },
  },
  settings: {
    calendarSync: false,
    syncedAssignments: {},
    hasUpdate: false,
    isCompact: false,
    hasUnread: [Entity.Notice],
    graduate: false,
  },
  semesters: {
    isFetching: false,
    items: ['2019-2020-2', '2019-2020-1'],
  },
  currentSemester: '2019-2020-2',
  courses: {
    isFetching: false,
    hidden: ['2019-2020-1139286494'],
    items: [
      {
        id: '2019-2020-1139282416',
        name: '三年级男生游泳提高班',
        teacherName: '杨听宇',
      },
      {
        id: '2019-2020-1139282824',
        name: '工程图学基础',
        teacherName: '冯涓',
      },
      {
        id: '2019-2020-1139282934',
        name: '量子与统计',
        teacherName: '杜春光',
      },
      {
        id: '2019-2020-1139283212',
        name: '概率论与随机过程(2)',
        teacherName: '李刚',
      },
      {
        id: '2019-2020-1139283216',
        name: '视听信息系统导论',
        teacherName: '陈健生',
      },
      {
        id: '2019-2020-1139283217',
        name: '数字系统设计',
        teacherName: '刘勇攀',
      },
      {
        id: '2019-2020-1139283219',
        name: '基于数字信号处理器的系统设计',
        teacherName: '窦维蓓',
      },
      {
        id: '2019-2020-1139283221',
        name: '通信与网络',
        teacherName: '周世东',
      },
      {
        id: '2019-2020-1139283977',
        name: '电子系统设计',
        teacherName: '徐淑正',
      },
      {
        id: '2019-2020-1139286494',
        name: '实验室科研探究（3）',
        teacherName: '汤彬',
      },
    ],
  },
  notices: {
    isFetching: false,
    unread: ['26ef84e76db3f55b016db4c4e8832da6'],
    pinned: ['26ef84e86d60f069016dadb09dd673b2'],
    favorites: [
      '26ef84e76d60efc1016d71b8f4c63bc1',
      '26ef84e76cc258ed016d3ea25a95157d',
    ],
    items: [
      {
        id: '26ef84e86d60f069016dadb09dd673b2',
        content:
          '\n \n \n  <p>助教已安排好了交作业方式，请不要再交到理科楼的作业箱，以免造成丢失或延误批改。</p> \n \n',
        title:
          '请按照助教的安排交作业（不要再放到原来的作业箱，以免丢失或延误）',
        publisher: '杜春光',
        hasRead: false,
        markedImportant: true,
        publishTime: '2019-10-09 07:21',
        courseId: '2019-2020-1139282934',
      },
      {
        id: '26ef84e76d60efc1016d71b8f4c63bc1',
        content:
          '\n \n \n  <p>根据学校放假调课安排，9月29日（周日）改上周五课，量子与统计课为早上8：00.</p> \n \n',
        title: '调课提醒：9月29日（周日）8：00有课（改上周五课）',
        publisher: '杜春光',
        hasRead: false,
        markedImportant: true,
        publishTime: '2019-09-27 15:52',
        courseId: '2019-2020-1139282934',
      },
      {
        id: '26ef84e76db3f55b016db4c4e8832da6',
        content:
          '\n \n \n  <p>第一次大作业已布置，请同学们仔细阅读作业说明文档，注意作业截止日期，合理安排时间。</p> \n \n',
        title: '第一次大作业',
        publisher: '薛有泽',
        hasRead: false,
        markedImportant: false,
        publishTime: '2019-10-10 16:22',
        courseId: '2019-2020-1139283216',
      },
      {
        id: '26ef84e76d60efc1016daba2cc3451fc',
        content:
          '\n \n \n  <p>各位同学：</p> \n  <p>为方便同学们实验，10月9日课程地点改为<span style="color:#c0392b"><span style="font-size:16px">中央主楼916机房</span></span>，时间还是原上课时间（13:30开始），请各位同学相互转告~</p> \n  <p> </p> \n  <p>祝 好！</p> \n \n',
        title: '10月9日课程地点',
        publisher: '孙文钰',
        hasRead: false,
        markedImportant: true,
        publishTime: '2019-10-08 21:46',
        courseId: '2019-2020-1139283217',
      },
      {
        id: '26ef84e76d60efc1016d7fdd00382858',
        content:
          '\n \n \n  <p>统一作业为四个班都要求的作业，<strong>全部计入课程成绩</strong>；除了统一作业之外，其它是本班专属作业，建议尽量按时完成，期末根据整体完成情况，<strong>酌情加分</strong>。</p> \n \n',
        title: '作业相关说明',
        publisher: '马赫',
        hasRead: false,
        markedImportant: true,
        publishTime: '2019-09-30 09:49',
        courseId: '2019-2020-1139283221',
      },
      {
        id: '26ef84e76cc258ed016d3fa2f27d5f10',
        content: '\n \n \n  <p>可跟贴讨论。</p> \n \n',
        title: '课程讨论区里，发了一条关于第1讲作业的提示',
        publisher: '周世东',
        hasRead: false,
        markedImportant: false,
        publishTime: '2019-09-17 22:30',
        courseId: '2019-2020-1139283221',
      },
      {
        id: '26ef84e76cc258ed016d3ea25a95157d',
        content:
          '\n \n \n  <p><span style="font-size:xx-large"><span style="color:black">原：固定事件个数</span><span style="color:black"><em>M</em></span><span style="color:black">的离散信源，均匀分布熵最大，</span><span style="color:black">为</span><span style="color:black">1/</span><span style="color:black"><em>M</em></span></span></p> \n  <p><span style="font-size:24pt"><span style="color:black">更正为：固定事件个数</span></span><span style="font-size:24pt"><span style="color:black"><em>M</em></span></span><span style="font-size:24pt"><span style="color:black">的离散信源，均匀分布熵最大，</span></span><span style="font-size:24pt"><span style="color:black">为</span></span><span style="font-size:24pt"><span style="color:black">log</span></span><span style="font-size:24pt"><span style="color:black"><em>M</em></span></span></p> \n \n',
        title: '信源的信息度量课件第19页更正',
        publisher: '周世东',
        hasRead: false,
        markedImportant: false,
        publishTime: '2019-09-17 17:50',
        courseId: '2019-2020-1139283221',
      },
    ],
  },
  files: {
    isFetching: false,
    unread: [],
    pinned: [],
    favorites: [
      '2016310500_KJ_157080064094130b5f1dcc2-f77a-4cca-be0f-95808af85d82',
      '2009990022_KJ_1570695522456476bc2332-2988-4497-9505-d12d41906be0',
      '1996990293_KJ_15706235088371327f3cdca-80cd-48b1-ab44-51afe80978b5',
    ],
    items: [
      {
        id: '2016310500_KJ_15698450108902028208ddc-e7b5-4674-a7cd-d52e857cc18a',
        title: '深度学习框架',
        description: '',
        size: '1.0M',
        uploadTime: '2019-10-11 21:31',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        isNew: false,
        markedImportant: false,
        fileType: 'pdf',
        courseId: '2019-2020-1139283217',
      },
      {
        id: '2016310500_KJ_157080064094130b5f1dcc2-f77a-4cca-be0f-95808af85d82',
        title: '神经网络典型结构及应用',
        description: '',
        size: '1.0M',
        uploadTime: '2019-10-11 21:31',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        markedImportant: false,
        isNew: false,
        fileType: 'pdf',
        courseId: '2019-2020-1139283217',
      },
      {
        id: '2001990202_KJ_15707817678040948955152-a653-49b7-9ee9-9dde1a651fd9',
        title: '量子7（测量几率、不确定关系）',
        description: '24-26 页有关于不确定度的补充解释（紫色字体）',
        size: '2.0M',
        uploadTime: '2019-10-11 16:16',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        markedImportant: false,
        isNew: false,
        fileType: 'pdf',
        courseId: '2019-2020-1139282934',
      },
      {
        id: '2009990022_KJ_1570695522456476bc2332-2988-4497-9505-d12d41906be0',
        title: '人类视觉系统',
        description: '',
        size: '8.0M',
        uploadTime: '2019-10-10 16:18',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        isNew: true,
        markedImportant: false,
        fileType: 'pdf',
        courseId: '2019-2020-1139283216',
      },
      {
        id: '2007990068_KJ_15706828497885105646d90-7cfa-4b19-acdf-dc721de009bb',
        title: '第四讲',
        description: '',
        size: '771K',
        uploadTime: '2019-10-10 12:47',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        isNew: true,
        markedImportant: false,
        fileType: 'pdf',
        courseId: '2019-2020-1139283212',
      },
      {
        id: '1996990293_KJ_15706235088371327f3cdca-80cd-48b1-ab44-51afe80978b5',
        title: '第四次实验用音频信号',
        description: 'DTMF',
        size: '1.0M',
        uploadTime: '2019-10-09 20:18',
        downloadUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        markedImportant: false,
        isNew: false,
        fileType: 'zip',
        courseId: '2019-2020-1139283219',
      },
    ],
  },
  assignments: {
    isFetching: false,
    unread: [],
    pinned: [],
    favorites: [],
    items: [
      {
        id: '26ef84e76db3f55b016db426e15c07b9',
        title: '大作业1',
        deadline: new Date(1571932740000).toISOString(),
        submitted: false,
        description: '<p>要求见课件</p>',
        submittedContent:
          '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>',
        attachmentName: '附件1.rar',
        attachmentUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        courseId: '2019-2020-1139283212',
        studentHomeworkId: '1',
      },
      {
        id: '26ef84e76d60efc1016d6c459d717434',
        title: '小作业1',
        deadline: new Date(1599753540000).toISOString(),
        submitted: true,
        description: '<p>手写，下堂课随堂交。</p>',
        submittedContent:
          '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>',
        attachmentName: '小作业1.pdf',
        attachmentUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        courseId: '2019-2020-1139283212',
        studentHomeworkId: '1',
      },
      {
        id: '26ef84e86cc25980016d39e751d54d3f',
        title: 'AutoCAD绘图基础练习',
        deadline: new Date(1569772740000).toISOString(),
        submitTime: new Date(1569232469000).toISOString(),
        submittedAttachmentUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        submitted: true,
        description:
          '<p>9月23日（周一）上课的时间，在李兆基A302集中上机，内容和要求如下：</p> \n  <p>1. 请参考上机指导书，完成并提交练习3。请在截至时间之前提交到网络学堂。</p> \n  <p>2. 需标注尺寸，并请按照原图中尺寸的方式标注。</p> \n  <p>3. 文件名可以自取，但请注意提交文件的后缀为 .dwg</p> \n  <p>注：如果同学们有时间，可以在完成练习3之后，尝试练习1和2（或者其中的部分功能，不用提交），以熟悉绘图模版是如何设置的。</p>',
        submittedContent:
          '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>',
        submittedAttachmentName: '绘图-2016011097.dwg',
        courseId: '2019-2020-1139282824',
        studentHomeworkId: '1',
      },
      {
        id: '26ef84e76db3f55b016db4c2dec22c79',
        title: '第一次大作业',
        deadline: new Date(1573401540000).toISOString(),
        submitted: false,
        description:
          '<p>第一次大作业——利用灭点灭线估计建筑物高度。本次作业需要同学们分组完成，请仔细阅读说明文档并注意作业的截止时间。</p>',
        submittedContent:
          '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>',
        attachmentName: '视听信息系统导论2019第一次大作业.rar',
        attachmentUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        courseId: '2019-2020-1139283216',
        studentHomeworkId: '1',
      },
      {
        id: '26ef84e76d60efc1016d7acd91310c35',
        title: '第一次书面作业',
        deadline: new Date(1571155140000).toISOString(),
        submitted: false,
        description:
          '<p>请在网络学堂提交电子版。如果手写请保证扫描或拍照足够清晰。</p>',
        submittedContent:
          '<!-- <span style="line-height: 24px;"> -->\r\n\t\t\t\t\t\t\t\t\t\t<span style="line-height:2;">\r\n\t\t\t\t\t\t\t\t\t\t</span>',
        attachmentName: '作业一.docx',
        attachmentUrl:
          'https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf',
        courseId: '2019-2020-1139283216',
        studentHomeworkId: '1',
      },
    ],
  },
  _persist: {
    rehydrated: true,
    version: -1,
  },
};

export default mockStore;
