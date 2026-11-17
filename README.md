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
    <img src="./docs/screenshots/iphone.webp?v=1" alt="iphone screenshot" height="350" width="161" />
    <img src="./docs/screenshots/mac.webp?v=1" alt="mac screenshot" height="350" width="518" />
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

- **[TUNA 镜像（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)**
  - 一般下载 `learnX-arm64-v8a-vX.X.X.apk`
  - 无法安装时，改用 `learnX-universal-vX.X.X.apk`

- [GitHub Releases](https://github.com/robertying/learnX/releases)

从 TUNA 镜像或 GitHub 安装的版本会在 App 内提示更新，并可直接下载安装。

### Windows / Linux

从 [TUNA 镜像（推荐）](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/)或 [GitHub Releases](https://github.com/robertying/learnX/releases) 下载，App 会自动更新。

- Windows（x64、ARM64）：下载 `learnX-Setup-X.X.X.exe`。安装程序没有签名，如果 SmartScreen 弹出提示，请点按“更多信息”，再点按“仍要运行”。
- Linux（x64、ARM64）：Ubuntu 和 Debian 请安装 .deb 包（`sudo apt install ./learnX-X.X.X-amd64.deb`，ARM64 为 `arm64`）；在 Ubuntu 24.04 及更高版本上，AppImage 无法启用 Chromium 沙盒。其他发行版请使用 AppImage（先 `chmod +x`）。

## 功能

> 注意：本应用仅供清华大学学生使用。

课程公告、作业和文件，在 learnX 里一手掌握。有新内容发布、作业快截止时，learnX 会及时提醒你。

### 今天

- 打开就能看到今天的课程、快截止的作业和各门课的新内容
- 课程表：查看未来七天的课

### 课程内容

- 随时查看老师发布的公告和附件
- 课程文件随时预览、下载，也能分享到其他应用
- 查看作业要求、截止时间、提交和批改情况；可直接提交作业，附件也能从其他应用分享过来
- 作业没写完，草稿会自动保存
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
- 深色模式
- courseX 课程信息共享计划
- 在 Windows 上驻留系统托盘、开机启动

## 隐私

你的账号和课程内容只保存在你的设备上，只会发送到清华大学的服务器（开启课程信息共享时除外）。详见[隐私政策](docs/PRIVACY_POLICY_CN.md)。

## 开发

```bash
pnpm install
cp .env.example .env   # 填写演示账号
cd ios && LANG=en_US.UTF-8 bundle exec pod install && cd ..   # iOS / Mac
pnpm start             # 启动 Metro
pnpm ios               # 或 pnpm android
pnpm electron          # Windows / Linux 版
```

完整的开发环境配置见 [CONTRIBUTING.md](CONTRIBUTING.md)：所需工具、用自己的团队为 iOS 签名、Android SDK 与模拟器、Windows 与 Linux 版、用演示账号测试，以及检查与 Pull Request。代码约定和架构写在 [AGENTS.md](AGENTS.md) 和各文件夹的 `AGENTS.md` 里，开发者和编程智能体都可以参考。

## 开源协议

以 MIT 许可证开源，但**不包含**下列情况：

- 您过去或者目前为清华大学信息化技术中心工作；
- 您的项目受到任何与清华大学有关的机构的经济资助。

如果上述任意条件成立，任何未经授权的对本项目中代码的使用将会被认为是侵权。上文中的“使用”包括对项目的源代码或衍生品制作拷贝、修改、重新分发，无论是否用作商业用途。

本项目中使用的开源项目则应用其自带的许可证。

---

## English

[中文](#下载) · **English**

> Note: learnX is for Tsinghua University students only.

### Download

Requires iOS / iPadOS 17.6, macOS 14.6, Android 10 or Windows 10 and later, or Linux on x64 / ARM64.

- **iPhone, iPad and Mac:** [App Store](https://apps.apple.com/cn/app/learnx-thu-web-learning/id1459073115)
- **Android:** [Google Play](https://play.google.com/store/apps/details?id=io.robertying.learnx), the [TUNA Mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases). From the mirror or GitHub, download `learnX-arm64-v8a-vX.X.X.apk`, or `learnX-universal-vX.X.X.apk` if it doesn't install; these versions update from inside the app.
- **Windows and Linux:** the [TUNA Mirror (recommended)](https://mirrors.tuna.tsinghua.edu.cn/github-release/robertying/learnX/LatestRelease/) or [GitHub Releases](https://github.com/robertying/learnX/releases). The app updates itself.
  - Windows (x64, ARM64): `learnX-Setup-X.X.X.exe`. The installer is unsigned: if SmartScreen warns, choose "More info", then "Run anyway".
  - Linux (x64, ARM64): on Ubuntu and Debian, install the .deb (`sudo apt install ./learnX-X.X.X-amd64.deb`, or `arm64`); on Ubuntu 24.04 and later, the AppImage runs without Chromium's sandbox. On other distributions, use the AppImage (`chmod +x` it first).

### Features

learnX brings your Web Learning notices, assignments and files together, and tells you when something new is posted or a deadline is near.

- **Today:** the day's classes, upcoming deadlines and new items in every course, and a schedule of the next seven days
- **Course content:** notices with their attachments, file previews and downloads, assignment details, grading and submission, submission drafts, and offline reading
- **Notifications and reminders:** new notices, files, assignments and grades, moved deadlines, late submission windows and grader comments, deadline and class reminders, and calendar sync (plus Reminders on iPhone, iPad and Mac)
- **More:** widgets (iPhone, iPad and Android), Spotlight and Siri (iPhone, iPad and Mac), global search, favorites synced with Web Learning, archiving, hiding courses, switching semesters, dark mode, courseX Course Information Sharing, and the tray and Start at login on Windows

### Privacy

Your account and course content stay on your device and only go to Tsinghua's servers, unless you turn on Course Information Sharing. See the [privacy policy](docs/PRIVACY_POLICY_EN.md).

### Development

See the commands above. [CONTRIBUTING.md](CONTRIBUTING.md) walks through the full setup (tools, iOS signing with your own team, Android SDK and emulator, the Windows and Linux app, testing with the mock login, checks and pull requests). Conventions and architecture are in [AGENTS.md](AGENTS.md) and the folders' own `AGENTS.md` files, written for both people and coding agents.

### License

MIT licensed, except for anyone who:

- works or has worked for the Computer and Information Management Center of Tsinghua University (清华大学信息化技术中心); or
- has a project funded by any institution affiliated with Tsinghua University.

For them, any use of code from this project without the author's explicit permission is copyright infringement. "Use" includes copying, modifying or redistributing the source code or any derivative of this project, for commercial or non-commercial purposes.

Open-source code used in this project remains under its own licenses.

## ICP 备案 ICP Filing

[浙ICP备20024838号-2A](https://beian.miit.gov.cn/)
