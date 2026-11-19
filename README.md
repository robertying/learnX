<div align="center">

<img src="./docs/assets/logo.webp?v=2" alt="logo" width="128" height="128" />

<h1>learnX</h1>

清华大学网络学堂 App，以 React Native 构建。

App for Tsinghua University Web Learning, developed with React Native. ⚛️

**中文** · [English](#english)

<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/v/release/robertying/learnX?color=brightgreen" alt="GitHub release (latest SemVer)" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=iphone" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ios-blue" alt="Platform iOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=ipad" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-ipados-blue" alt="Platform iPadOS" height="20" width="auto"></a>
<a href="https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115?platform=mac" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-macos-blue" alt="Platform macOS" height="20" width="auto"></a>
<a href="https://play.google.com/store/apps/details?id=io.robertying.learnx" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-android-red" alt="Platform Android" height="20" width="auto"></a>
<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-windows-0078d4" alt="Platform Windows" height="20" width="auto"></a>
<a href="https://github.com/robertying/learnX/releases" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/platform-linux-orange" alt="Platform Linux" height="20" width="auto"></a>

<div align="center">
    <img src="./docs/screenshots/iphone.webp?v=2" alt="iphone screenshot" height="350" width="161" />
    <img src="./docs/screenshots/mac.webp?v=2" alt="mac screenshot" height="350" width="467" />
</div>

</div>

## 下载

支持 iOS / iPadOS 17.6、macOS 14.6、Android 10、Windows 10 及更高版本，以及 x64 / ARM64 的 Linux。

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

- **[TUNA 镜像站（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)**
  - 一般下载 `learnX-arm64-v8a-vX.X.X.apk`
  - 无法安装时，改用 `learnX-universal-vX.X.X.apk`

- [GitHub Releases](https://github.com/robertying/learnX/releases)

从 TUNA 镜像站或 GitHub 安装的版本会在 learnX 内提示更新，并可直接下载安装。

### Windows / Linux

从 [TUNA 镜像站（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) 或 [GitHub Releases](https://github.com/robertying/learnX/releases) 下载，learnX 会自动更新。

- **Windows**
  - 下载 `learnX-windows-vX.X.X.exe`（x64 和 ARM64 通用）
  - 安装程序没有签名，如果提示“Windows 已保护你的电脑”，请点击“更多信息”，再点击“仍要运行”

- **Ubuntu / Debian**
  - x64 下载 `learnX-linux-amd64-vX.X.X.deb`，ARM64 下载 `learnX-linux-arm64-vX.X.X.deb`
  - 用 `sudo apt install ./learnX-linux-amd64-vX.X.X.deb` 安装（ARM64 换成对应文件名）

- **其他 Linux 发行版**
  - x64 下载 `learnX-linux-x86_64-vX.X.X.AppImage`，ARM64 下载 `learnX-linux-arm64-vX.X.X.AppImage`
  - 先用 `chmod +x` 加上执行权限，再直接运行
  - Ubuntu 上请用 .deb：Ubuntu 24.04 起，AppImage 无法启用 Chromium 沙盒

## 功能

> 注意：本应用仅供清华大学学生使用。

课程公告、作业和文件，在 learnX 里一手掌握。有新内容发布、作业快截止时，learnX 会及时提醒你。

### 今天

- 打开就能看到今天的课程、快截止的作业和各门课的新内容
- 课表：查看未来七天的课

### 课程内容

- 随时查看老师发布的公告和附件
- 课程文件随时预览、下载，也能分享到其他应用
- 查看作业要求、截止时间、提交和批改情况；可直接提交作业，附件也能从其他应用分享过来
- 加载过的内容，没有网络也能看

### 通知与提醒

- 有新公告、新文件、新作业或出了成绩，第一时间通知你
- 截止时间变了、开放补交、老师写了评语，也会告诉你
- 作业截止前、上课前提醒你
- 课表和作业可同步到日历，在 iPhone、iPad 和 Mac 上作业也可同步到提醒事项

### 更多功能

- 小组件：作业截止、下一节课（iPhone、iPad 和 Android）
- 用聚焦搜索查找公告、作业和文件，或直接问 Siri 下一节课是什么（iPhone、iPad 和 Mac）
- 全局搜索
- 收藏、归档公告、作业和文件，收藏与网络学堂同步
- 屏蔽不需要的课程
- 切换学期
- courseX 课程信息共享计划

## 隐私

除了清华大学的服务器，learnX 不会把你的账号和课程内容发到任何地方，它们只保存在你的设备上。唯一的例外是课程信息共享：开启后，learnX 会把本学期课程的公开信息上传到 courseX，但不会上传任何关于你本人的信息。详见[隐私政策](docs/PRIVACY_POLICY_CN.md)。

## 开发

开发环境的配置方法见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源协议

以 MIT 许可证开源，但**不包含**下列情况：

- 你过去或者目前为清华大学信息化技术中心工作；
- 你的项目受到任何与清华大学有关的机构的经济资助。

如果上述任意条件成立，任何未经授权的对本项目中代码的使用将会被认为是侵权。上文中的“使用”包括对项目的源代码或衍生品制作拷贝、修改、重新分发，无论是否用作商业用途。

本项目中使用的开源项目则应用其自带的许可证。

---

## English

[中文](#下载) · **English**

> Note: learnX is for Tsinghua University students only.

### Download

Requires iOS / iPadOS 17.6, macOS 14.6, Android 10, or Windows 10 and later, or Linux on x64 / ARM64.

- **iPhone, iPad, and Mac:** [App Store](https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115)

- **Android:** [Google Play](https://play.google.com/store/apps/details?id=io.robertying.learnx), the [TUNA mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases)
  - From the mirror or GitHub, download `learnX-arm64-v8a-vX.X.X.apk`
  - If it doesn't install, use `learnX-universal-vX.X.X.apk` instead
  - Versions from the mirror or GitHub let you update from inside the app

- **Windows and Linux:** the [TUNA mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases), and the app updates itself

- **Windows**
  - Download `learnX-windows-vX.X.X.exe` (one installer for x64 and ARM64)
  - The installer is unsigned: if Windows says "Windows protected your PC", choose "More info", then "Run anyway"

- **Ubuntu / Debian**
  - On x64, download `learnX-linux-amd64-vX.X.X.deb`; on ARM64, `learnX-linux-arm64-vX.X.X.deb`
  - Install it with `sudo apt install ./learnX-linux-amd64-vX.X.X.deb` (use the ARM64 file name on ARM64)

- **Other Linux distributions**
  - On x64, download `learnX-linux-x86_64-vX.X.X.AppImage`; on ARM64, `learnX-linux-arm64-vX.X.X.AppImage`
  - Make it executable with `chmod +x`, then run it
  - On Ubuntu, use the .deb: since Ubuntu 24.04, the AppImage can't turn on Chromium's sandbox

### Features

learnX brings your Web Learning notices, assignments, and files together, and tells you when something new is posted or a deadline is near.

- **Today:** the day's classes, upcoming deadlines, and new items in every course, and a schedule of the next seven days
- **Course content:** notices with their attachments, file previews and downloads, assignment details, grading and submission, and offline reading
- **Notifications and reminders:** new notices, files, assignments, and grades, moved deadlines, late submission windows, and grader comments, deadline and class reminders, and calendar sync (plus Reminders on iPhone, iPad, and Mac)
- **More:** widgets (iPhone, iPad, and Android), Spotlight and Siri (iPhone, iPad, and Mac), global search, favorites synced with Web Learning, archiving, hiding courses, switching semesters, and courseX Course Information Sharing

### Privacy

learnX sends your account and course content only to Tsinghua's servers, and keeps them on your device. The one exception is Course Information Sharing: when you turn it on, learnX uploads public information about your courses this semester to courseX, and nothing about you. See the [privacy policy](docs/PRIVACY_POLICY_EN.md).

### Development

See [CONTRIBUTING.md](CONTRIBUTING.md) to set up a development environment.

### License

MIT licensed, except for anyone who:

- works or has worked for the Computer and Information Management Center of Tsinghua University (清华大学信息化技术中心); or
- has a project funded by any institution affiliated with Tsinghua University.

For them, any use of code from this project without the author's explicit permission is copyright infringement. "Use" includes copying, modifying, or redistributing the source code or any derivative of this project, for commercial or non-commercial purposes.

Open-source code used in this project remains under its own licenses.

## ICP 备案 ICP Filing

[浙ICP备20024838号-2A](https://beian.miit.gov.cn/)
