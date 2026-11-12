<div align="center">

<img src="./docs/assets/logo.webp" alt="logo" width="128" height="128" />

<h1>learnX</h1>

清华大学网络学堂 App，以 React Native 构建。

App for Tsinghua University Web Learning, developed with React Native. ⚛️

<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/v/release/robertying/learnX?color=brightgreen" alt="GitHub release (latest SemVer)" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx/id1459073115#?platform=iphone" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ios-blue" alt="Platform iOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx/id1459073115#?platform=ipad" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ipados-blue" alt="Platform iPadOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx/id1459073115#?platform=mac" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-macos-blue" alt="Platform macOS" height="20" width="auto"></a>
<a href="https://play.google.com/store/apps/details?id=io.robertying.learnx" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-android-red" alt="Platform Android" height="20" width="auto"></a>

<div align="center">
    <img src="./docs/screenshots/iphone.webp?v=1" alt="iphone screenshot" height="350" width="161" />
    <img src="./docs/screenshots/mac.webp?v=1" alt="mac screenshot" height="350" width="518" />
</div>

</div>

## 下载 Download

需要 iOS / iPadOS 17.6、macOS 14.6 或 Android 9 及以上版本。

Requires iOS / iPadOS 17.6, macOS 14.6 or Android 9 and later.

### iOS / iPadOS / macOS

<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=iphone" target="_blank" rel="noopener noreferrer">
    <img align="center" height=40 alt="App Store 下载" src="docs/assets/Download_on_the_App_Store_Badge_CNSC_RGB_blk_092917.svg" />
</a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=mac" target="_blank" rel="noopener noreferrer">
    <img align="center" height=40 alt="Mac App Store 下载" src="docs/assets/Download_on_the_Mac_App_Store_Badge_CNSC_RGB_blk_092917.svg" />
</a>

### Android

- <a href="https://play.google.com/store/apps/details?id=io.robertying.learnx" target="_blank" rel="noopener noreferrer">
      <img align="center" height=52 alt="下载应用，请到 Google Play" src="docs/assets/google-play-badge.png" />
  </a>

- **[TUNA 镜像（推荐） TUNA Mirror (Recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)**
  - 默认下载 Download `learnX-arm64-v8a-vX.X.X.apk`
  - 若安装失败，请尝试 Download if there's an issue installing `learnX-universal-vX.X.X.apk`

- [GitHub Releases](https://github.com/robertying/learnX/releases)

## 功能 Features

> 注意：本应用只适用于清华大学学生。
>
> Note: the App is for Tsinghua University students only.

### 基础功能 Basic

- 今日概览：当天课程、即将截止的作业和未读内容一目了然。

  Today: the day's classes, upcoming deadlines and unread items at a glance.

- 第一时间看到老师最新发布的公告及其附件。

  See the newest notices from your teachers, with their attachments.

- 预览或下载课程文件，将文件分享到其他应用。

  Preview or download course files, and share them to other apps.

- 一览作业要求，不错过任何 deadline，实时查询作业提交与批改情况。提交作业，可从其他应用分享文件作为附件。

  See every assignment and its deadline, and check submission and grading status. Submit assignments, attaching files shared from other apps.

### 高级功能 Advanced

- 桌面小组件（作业截止、接下来） Home screen widgets (Deadlines, Up Next)
- 新内容、成绩和截止时间变更通知 Notifications for new notices, files, assignments, grades and deadline changes
- 作业截止提醒和上课提醒 Deadline reminders and class reminders
- 聚焦搜索、Siri 与快捷指令 Spotlight search, Siri and Shortcuts (iOS, iPadOS, macOS)
- 课表日历同步 Course schedule calendar sync
- 作业日历/提醒事项同步 Assignment calendar/reminder sync
- courseX 课程信息共享计划 Course Information Sharing
- 收藏内容（与网络学堂同步） Favorites, synced with Web Learning
- 归档内容 Archiving notices, files and assignments
- 隐藏课程 Hiding courses
- 全局搜索 Global search
- 切换学期 Switching among semesters
- 暗黑模式 Dark mode

## 隐私 Privacy

账号和课程内容只保存在您的设备上，只会发送给清华大学的服务器（开启课程信息共享时除外）。详见隐私政策。

Your account and course content stay on your device and only go to Tsinghua's servers, unless you turn on Course Information Sharing. See the privacy policy for details.

- [隐私政策](docs/PRIVACY_POLICY_CN.md)
- [Privacy Policy](docs/PRIVACY_POLICY_EN.md)

## 开发 Development

```bash
pnpm install
cp .env.example .env   # 填写演示账号 fill in the mock login values
cd ios && LANG=en_US.UTF-8 bundle exec pod install && cd ..   # iOS / Mac
pnpm start             # 启动 Metro start Metro
pnpm ios               # 或 or: pnpm android
```

[CONTRIBUTING.md](CONTRIBUTING.md) 介绍完整的开发环境配置（工具、用自己的团队为 iOS 签名、Android SDK 与模拟器、用演示账号测试、检查与 Pull Request）。代码约定和架构见 [AGENTS.md](AGENTS.md) 及各文件夹中的 `AGENTS.md`，供开发者和编程智能体共同阅读。

[CONTRIBUTING.md](CONTRIBUTING.md) walks through the full setup (tools, iOS signing with your own team, Android SDK and emulator, testing with the mock login, checks and pull requests). Conventions and architecture are in [AGENTS.md](AGENTS.md) and the folders' own `AGENTS.md` files, written for both people and coding agents.

## 开源协议 License

以 MIT 许可证开源，但**不包含**下列情况：

- 您过去或者目前为清华大学信息化技术中心工作；
- 您的项目受到任何与清华大学有关的机构的经济资助。

如果上述任意条件成立，任何未经授权的对本项目中代码的使用将会被认为是侵权。上文中的“使用”包括对项目的源代码或衍生品制作拷贝、修改、重新分发，无论是否用作商业用途。

本项目中使用的开源项目则应用其自带的许可证。

---

MIT licensed, with the following restrictions:

For those

- who are working or have worked for Computer and Information Managing Center, Tsinghua University;
- whose project is financially supported by any institute in relation to Tsinghua University.

Any usage of code, without explicit authorizations from the author, from this project will be considered as infringement of copyright. The word "usage" may refer to making copies of, modifying, redistributing of the source code or any derivative of this project, for either commercial or non-commercial use.

Open source code used in this project is subjected to their own licenses.

## ICP 备案 ICP Filing

[浙ICP备20024838号-2A](https://beian.miit.gov.cn/)
