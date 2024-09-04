import en from './en';

const zh: typeof en = {
  back: '返回',
  notices: '通知',
  assignments: '作业',
  files: '文件',
  courses: '课程',
  calendarsAndReminders: '日历与提醒事项',
  semesterSelection: '学期切换',
  fileSettings: '文件',
  helpAndFeedback: '帮助与反馈',
  about: '关于',
  changelog: '更新日志',
  settings: '设置',
  search: '搜索',
  submit: '提交',
  submitted: '已提交',
  assignmentSubmission: '作业提交',
  loginFailed: '登录失败，请检查网络连接并确保输入的用户名与密码正确。',
  versionInformation: '版本信息',
  opensourceAt: '本项目开源于',
  specialThanks: '特别感谢',
  harryChen: 'Harry Chen 的',
  yayuXiao: 'Yayu Xiao 制作的 App icon',
  opensourceDependencies: '开源依赖',
  noAssignmentDescription: '无作业描述',
  assignmentSyncNoCalendarPermission:
    '作业同步失败：请给予 App 日历的完全访问权限；如果您已经授予该权限，请尝试重启 App',
  assignmentSyncNoReminderPermission:
    '作业同步失败：请给予 App 提醒事项访问权限；如果您已经授予该权限，请尝试重启 App',
  assignmentSyncFailed: '作业同步失败：',
  filePickFailed: '选取文件失败',
  assignmentSubmissionSucceeded: '作业提交成功',
  assignmentSubmissionFailed: '作业提交失败',
  submitAssignment: '提交作业',
  submitAssignmentConfirmation: '确定提交作业？',
  cancel: '取消',
  ok: '确定',
  assignmentSubmissionFilenamePlaceholder: '自定义附件名（可选）',
  assignmentSubmissionContentPlaceholder: '作业内容（可选）',
  undoRemoveAttachment: '撤销移除已上传附件',
  removeAttachment: '移除已上传附件',
  reUploadAttachment: '重新上传附件',
  overwriteAttachment: '覆盖已上传附件',
  uploadAttachment: '上传附件',
  courseScheduleSyncSucceeded: '课表同步成功',
  courseScheduleSyncNoCalendarPermission:
    '课表同步失败：请给予 App 日历的完全访问权限；如果您已经授予该权限，请尝试重启 App',
  courseScheduleSyncNoReminderPermission:
    '课表同步失败：请给予 App 提醒事项访问权限；如果您已经授予该权限，请尝试重启 App',
  courseScheduleSyncRepetitiveError:
    '课表同步失败，请重试。请确保已连接至校园网；如果问题持续存在，请尝试缩小或更改同步的日期范围',
  courseScheduleSyncNoCourse:
    '无课表可供同步，请检查网络学堂网页版在此日期范围内是否存在上课日程',
  configureCalendarAndReminder: '日历与提醒事项权限设置',
  deleteSyncedCalendarsAndReminders: '删除已同步的日历与提醒事项',
  deleteSyncedCalendarsAndRemindersConfirmation:
    '确定删除已同步的日历与提醒事项？该操作不可撤销。',
  deleteSucceeded: '删除成功',
  deleteFailedNoCalendarPermission:
    '删除失败：请给予 App 日历的完全访问权限；如果您已经授予该权限，请尝试重启 App',
  deleteFailedNoReminderPermission:
    '删除失败：请给予 App 提醒事项访问权限；如果您已经授予该权限，请尝试重启 App',
  deleteFailed: '删除失败：',
  graduate: '研究生',
  syncCourseSchedule: '同步课表',
  classAlarm: '上课提醒',
  classAlarmBefore: '提前提醒（分钟）',
  assignmentCalendarSync: '作业日历同步',
  calendarEventLength: '日程长度（分钟）',
  assignmentCalendarAlarm: '日历提醒',
  assignmentCalendarAlarmOffset: '提前提醒（分钟）',
  assignmentCalendarSecondAlarm: '日历第二次提醒',
  assignmentCalendarSecondAlarmOffset: '第二次提前提醒（分钟）',
  assignmentReminderSync: '作业提醒事项同步',
  assignmentReminderAlarm: '提醒事项截止时间提前',
  assignmentReminderAlarmOffset: '截止时间提前（分钟）',
  assignmentSyncDescription:
    '启用后，作业会在刷新时自动同步；已屏蔽课程的作业或已归档、已过期的作业不会被同步；请在更改设置后刷新作业以应用更改。',
  clearFileCache: '清空文件缓存',
  clearFileCacheConfirmation: '确定清空文件缓存？该操作不可撤销。',
  clearFileCacheSucceeded: '清空文件缓存成功',
  clearFileCacheFailed: '清空文件缓存失败：',
  fileUseDocumentDir: '保存打开的文件到“文档”',
  fileOmitCourseName: '文件名不包含课程名',
  fileDownloadFailed: '文件下载失败，请重试。',
  openFileFailed:
    '文件打开失败。请重新下载文件或确保存在可打开此文件类型的应用。',
  share: '分享',
  open: '打开',
  email: '邮件',
  missingUsername: '请输入用户名或学号',
  missingPassword: '请输入密码',
  credentialError: '账号或密码错误',
  unknownError: '未知错误：',
  usernameOrId: '用户名 / 学号',
  password: '密码',
  securityNote: '您的用户信息仅会被保存在本地，并由操作系统安全地加密',
  login: '登录',
  noNoticeContent: '无通知内容',
  searchPlaceholder: '搜索通知、作业、文件……',
  logout: '退出登录',
  logoutConfirmation: '确定退出登录？该操作会清除你当前的所有设置。',
  foundNewVersion: '检测到新版本',
  unfinished: '未完成',
  finished: '已完成',
  all: '全部',
  unread: '未读',
  fav: '收藏',
  archived: '归档',
  hidden: '屏蔽',
  empty: '无内容',
  removeFromFav: '已从收藏移除',
  addToFav: '已添加到收藏',
  undoArchive: '已撤销归档',
  archiveSucceeded: '已归档',
  undoHide: '已撤销屏蔽',
  hideSucceeded: '已屏蔽',
  courseInformationSharing: '课程信息共享计划',
  joinCourseInformationSharing: '加入课程信息共享计划',
  joinCourseInformationSharingConfirmation:
    '确定加入课程信息共享计划？当前学期的课程信息将会被自动上传；上传内容不包含任何个人信息。',
  courseX: '课程信息共享计划 courseX',
  courseInformation: '课程信息',
  missingCalendarSource:
    '不存在可写入的日历：请确保“日历”应用内存在 iCloud 日历目录或至少一个本地日历目录。',
  pushNotifications: '推送通知',
  copyPushNotificationToken: '复制设备标识符',
  pushNotificationTokenDescription:
    '使用此标识符，配合 learnX Companion 应用，您可以在此设备上接收推送通知。请勿分享此标识符给其他人。',
  copied: '已复制',
  configurePushNotifications: '推送通知权限设置',
  noPushNotificationsPermission: '未授予推送通知权限',
  learnXCompanionUsageGuide: 'learnX Companion 使用指南',
  noFileDescription: '无文件描述',
  githubRecommended: 'GitHub（推荐）',
  createNewGitHubIssue: '创建新的 GitHub Issue',
  emailNotRecommended: '邮箱',
  issueTemplate: '问题反馈与帮助',
  issueTemplateDescription:
    '如通过邮件提交问题反馈或寻求帮助，请务必使用以下模板：',
  issueTemplateContent: `
    - 问题描述
    - 复现步骤
    - 已尝试的解决方案
    - 截图
    - App 版本
    - 设备型号
    - 系统版本
    - 其他补充信息
  `,
  shareReceived: '您刚分享的内容已被接收，将在下次作业提交时自动选中',
  sharedContentSelected: '您之前分享的内容已被自动选中作为作业附件',
  noFileSize: '未知文件大小',
  datePickerStartLabel: '开始',
  datePickerEndLabel: '结束',
  datePickerSaveLabel: '同步',
  datePickerLabel: '选择同步范围',
  reviewed: '已阅',
  good: '优秀',
  exemptedCourse: '免课',
  exempted: '免修',
  pass: '通过',
  fail: '不通过',
  incomplete: '缓考',
  openFileAfterDownload: '自动打开已下载的文件',
  loggingIn: '登录中……',
  archive: '归档',
  restore: '恢复',
  reorder: '排序',
  dragToReorder: '长按并拖动以排序',
  documents: '文件',
  photos: '照片',
};

export default zh;
