import { IPersistAppState, Tab } from "./types/state";

const mockStore: IPersistAppState = {
  auth: {
    loggingIn: false,
    loggedIn: true,
    username: "yingr16",
    password: "password",
    _persist: {
      rehydrated: true,
      version: 1
    }
  },
  settings: {
    tabsOrder: [
      Tab.Notices,
      Tab.Files,
      Tab.Assignments,
      Tab.Courses,
      Tab.Settings
    ]
  },
  toast: {
    text: "hello",
    visible: false
  },
  semesters: {
    isFetching: true,
    items: ["2018-2019-2", "2017-2018-3"]
  },
  currentSemester: "2018-2019-2",
  courses: {
    isFetching: false,
    items: [
      {
        id: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        name: "大学生职业生涯规划与发展",
        teacherName: "张超"
      },
      {
        id: "2018-2019-226ef84e7689589e9016898f36e671110",
        name: "三年级男生跳水",
        teacherName: "于芬"
      }
    ]
  },
  notices: {
    isFetching: false,
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        content: "content",
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
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        description: "",
        downloadUrl:
          "https://learn2018.tsinghua.edu.cn/b/wlxt/kj/wlkc_kjxxb/student/downloadFile?sfgk=0&wjid=2009990004_KJ_155359162152096e2bc4dfd-e8e2-44bc-9735-fdcb62af6867",
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
    items: [
      {
        courseId: "2018-2019-226ef84e7689589e9016898eaca0970f7",
        attachmentName: "图像实验任务说明.zip",
        attachmentUrl:
          "https://learn2018.tsinghua.edu.cn/b/wlxt/kczy/zy/student/downloadFile/2018-2019-226ef84e7689589e901689903f8333839/2017310626_ZY_155368838284782e2bc4dfd-e8e2-44bc-9735-fdcb62af6867",
        deadline: new Date().toDateString(),
        description: "<p>详见附件</p>",
        id: "26ef84e769b413d20169bf0b4df07239",
        submitTime: undefined,
        submitted: false,
        submittedAttachmentUrl: undefined,
        submittedContent: "content",
        title: "图像实验要求及说明"
      }
    ]
  },
  _persist: {
    rehydrated: true,
    version: 1
  }
};

export default mockStore;
