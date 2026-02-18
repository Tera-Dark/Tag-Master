# Tag Master (LoRA 训练数据集打标助手)

**Tag Master** 是一个专为 AI 绘画模型训练（如 LoRA、Checkpoints）设计的本地化数据集打标与管理工具。它可以帮助你高效地整理图片、自动生成标签（Caption），并进行批量编辑和导出。

## ✨ 核心功能

*   **多模型支持**: 集成 **Google Gemini** (3.0 Flash / Pro)，提供精准的图像理解与打标能力。
*   **本地优先**: 所有图片处理在浏览器端完成，无需上传至第三方服务器（仅在打标时发送至 LLM API），保护你的数据集隐私。
*   **高效批量处理**: 支持并发队列自动打标，大幅缩短数据集准备时间。
*   **可视化管理**:
    *   **项目制管理**: 多数据集隔离，随时切换。
    *   **瀑布流/网格视图**: 灵活查看图片与标签。
    *   **拖拽排序与整理**: 直观地移动或合并图片。
*   **强大的编辑工具**:
    *   批量查找/替换标签。
    *   根据标签长度或内容筛选图片。
    *   支持手动微调标签。
*   **一键导出**: 支持导出为标准的 `图片 + .txt` 格式或打包为 Zip，直接用于 Kohya_ss 等训练框架。

## 🚀 快速开始 (Quick Start)

### 1. 环境准备
确保你的电脑已安装 [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)。

### 2. 安装依赖
在项目根目录下运行终端命令：

```bash
npm install
```

### 3. 配置 API Key (可选)
你可以在 `.env.local` 文件中预设 API Key，或者直接在软件的设置界面中填写。

创建 `.env.local` 文件：
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 4. 启动项目
运行开发服务器：

```bash
npm run dev
```
打开浏览器访问显示的本地地址（通常是 `http://localhost:5173`）。

## 🛠️ 开发指南

本项目使用 **React + TypeScript + Vite** 构建。

### 项目结构
```
src/
├── components/     # UI 组件
├── hooks/          # 自定义 React Hooks (逻辑核心)
├── services/       # API 服务与工具函数
├── utils/          # 通用工具
├── App.tsx         # 主应用入口
└── index.css       # 全局样式 (Tailwind)
```

### 常用命令

*   **启动开发服务器**: `npm run dev`
*   **类型检查与构建**: `npm run build`
*   **代码风格检查**: `npm run lint`
*   **代码格式化**: `npm run format`

## 🤝 贡献
欢迎提交 Issue 或 Pull Request 来改进 Tag Master！

## 📄 许可证
MIT License
