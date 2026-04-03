# AI Timeline / AI 助手对话时间轴

[English](#english) | [中文](#中文)

---

<h2 id="english">English</h2>

### 📖 Introduction

**AI Timeline** is a lightweight, efficient Chrome extension designed for heavy users of Web-based AI Chatbots (like Gemini, ChatGPT, DeepSeek, etc.).

When engaging in long, multi-turn conversations with AI, it's often frustrating to scroll up and down repeatedly just to find a specific question you asked earlier. This extension solves that problem by automatically parsing the current webpage and generating a **Timeline Sidebar** on the right side of the screen. It collects all your historical prompts in the current session, allowing you to quickly navigate to any specific conversation block with a single click.

### ✨ Key Features

- **Auto-generated Timeline**: Automatically extracts user prompts and renders them in a neat sidebar list.
- **Smooth Navigation**: Click on any item in the timeline to smoothly scroll to the exact position of the conversation, complete with a highlighting animation.
- **Real-time Search**: Built-in search bar supports fuzzy matching, making it incredibly fast to locate specific topics within massive chat histories.
- **Multi-Platform Support**: Built with an adapter architecture, currently supporting **Google Gemini**, **ChatGPT**, and **DeepSeek**. (Highly extensible for future additions).
- **Theme Adaptability**: Seamlessly switches between Light and Dark modes, either following your system settings or toggling manually.

### 🚀 How to Install (Developer Mode)

1. Download or clone this repository to your local machine.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing this project.
5. Open an AI chat website (e.g., Gemini or ChatGPT) and enjoy!

---

<h2 id="中文">中文</h2>

### 📖 项目简介

**AI Timeline (AI 助手对话时间轴)** 是一款专为重度网页版 AI 用户（如 Gemini, ChatGPT, DeepSeek 等）打造的轻量级 Chrome 浏览器插件。

当我们在一个会话窗口中与 AI 进行了几十上百轮的深入探讨后，想要回头寻找之前问过的某个特定问题往往需要痛苦地反复滚动鼠标。这款插件的诞生正是为了解决这个痛点：它会自动读取当前网页，在屏幕右侧生成一个**时间轴侧边栏**，将你在这个会话中所有的“提问”提取成目录，只需轻轻一点，即可快速跳转到对应的对话位置。

### ✨ 核心功能

- **自动生成时间轴**：无感扫描网页 DOM，精准提取用户提问正文并渲染为侧边栏列表。
- **锚点平滑跳转**：点击时间轴上的任意一条记录，页面将平滑滚动至原消息处，并附带短暂的背景高亮动画，视觉反馈清晰。
- **实时模糊搜索**：内置搜索框，支持实时输入过滤，在海量聊天记录中秒寻历史话题。
- **多平台适配架构**：采用高内聚低耦合的适配器（Adapter）架构设计。目前已原生支持 **Google Gemini**、**ChatGPT** 以及 **DeepSeek**（极易扩展其他 AI 平台）。
- **暗黑模式兼容**：完美支持 Light/Dark 模式，可跟随系统或手动一键强制切换，保护视力。

### 🚀 安装指南 (开发者模式)

1. 将本项目下载或克隆到本地文件夹。
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/`。
3. 开启页面右上角的 **开发者模式 (Developer mode)**。
4. 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**，选择本项目所在的文件夹。
5. 打开任意支持的 AI 网页（如 Gemini 或 ChatGPT），即可在右侧看到你的对话时间轴！
