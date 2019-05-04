import { dummyPassword, dummyUsername } from "../helpers/dummy";
import { IPersistAppState, Tab } from "./types/state";

const mockStore: IPersistAppState = {
  auth: {
    loggingIn: false,
    loggedIn: true,
    username: dummyUsername,
    password: dummyPassword,
    _persist: {
      rehydrated: true,
      version: -1
    }
  },
  settings: {
    tabsOrder: [
      Tab.Notices,
      Tab.Files,
      Tab.Assignments,
      Tab.Courses,
      Tab.Settings
    ],
    autoRefreshing: false,
    calendarSync: false,
    syncedAssignments: {},
    hasUpdate: false
  },
  toast: {
    text: "",
    visible: false
  },
  semesters: {
    isFetching: false,
    items: ["2018-2019-2", "2017-2018-3"]
  },
  currentSemester: "2018-2019-2",
  courses: {
    isFetching: false,
    pinned: [],
    hidden: [],
    items: [
      {
        id: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        name: "大学生职业生涯规划与发展",
        teacherName: "张超"
      }
    ]
  },
  notices: {
    isFetching: false,
    pinned: ["26ef84e769b413d20169b9493d4d16e3"],
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        content: "Content here",
        hasRead: true,
        id: "26ef84e769b413d20169b9493d4d16e3",
        markedImportant: true,
        publishTime: new Date().toDateString(),
        publisher: "张超",
        title: "关于第六次课程停课并改为参观的有关安排通知"
      }
    ]
  },
  files: {
    isFetching: false,
    pinned: [],
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        description: "",
        downloadUrl:
          "https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf",
        fileType: "pptx",
        id: "2009990004_KJ_155359162152096e2bc4dfd-e8e2-44bc-9735-fdcb62af6867",
        isNew: false,
        markedImportant: false,
        size: "2.0M",
        title: "第五讲-决策：思考职业价值",
        uploadTime: new Date().toDateString()
      }
    ]
  },
  assignments: {
    isFetching: false,
    pinned: [],
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        attachmentName: "图像实验任务说明.zip",
        attachmentUrl:
          "https://www.apple.com/environment/pdf/Apple_Environmental_Responsibility_Report_2018.pdf",
        deadline: new Date(2000000000000).toDateString(),
        description: "<p>详见附件</p>",
        id: "26ef84e769b413d20169bf0b4df07239",
        submitTime: undefined,
        submitted: false,
        submittedAttachmentUrl: undefined,
        submittedContent: "Content here",
        title: "图像实验要求及说明"
      }
    ]
  },
  _persist: {
    rehydrated: true,
    version: -1
  }
};

export default mockStore;
