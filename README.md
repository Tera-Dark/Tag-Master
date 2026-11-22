# Tag Master

现代 AI 图像提示词打标工作室：把一批图片批量跑成可直接用于训练/出图的 caption，并逐条质检。
面向 **Krea 2 · MOSS-Image · Flux DiT · Anima · LoRA 数据集 · Danbooru 标签** 多套语法，而不是一套通用提示词。

## 它能干什么

- **多模型语法蓝图**：内置 `krea2`（自然散文）、`moss_prose`（长上下文空间叙事）、`moss_layout`（分镜/排版）、`flux_dit`、`anima`、`lora_hybrid`、`danbooru_tags` 七套规范，每套带有自己的结构公式与反模式清单（例如 Krea 2 禁用 `masterpiece` / `8k`，MOSS 禁用 `score_9`）。
- **五段式流水线**：工作区（导入分项目）→ 预处理（宽高比分桶、裁切）→ 提示词实验台（编译、改写、对照）→ 复核（逐条确认/打回）→ 导出（TXT / JSON，打包 ZIP）。
- **AI 服务商可插拔**：内置 Studio Gemini（走 `/api` 代理，AI Studio 环境下免密），也可接入 OpenAI 兼容 / OneAPI / NewAPI / vLLM / OpenRouter 等外部网关，密钥只留在本机浏览器。
- **本地优先**：项目与条目存在浏览器 IndexedDB，不上传图库。
- **中英双语界面 + 明暗主题**。

## 快速开始

需要 Node.js 20+（推荐用仓库自带的 Bun 锁文件）。

```bash
bun install            # 或 npm install
cp .env.example .env   # 填入 GEMINI_API_KEY（dotenv 默认只读 .env）
bun run dev            # tsx server.ts，默认 http://localhost:3000
```

生产构建：`bun run build`（Vite 产物在 `dist/`），`bun run start` 起 Express 服务。
类型检查：`bun run lint`（`tsc --noEmit`）。

> 只用外部网关（中转站）时可以不填 `GEMINI_API_KEY`，在「设置 → 服务商」里添加自定义 OpenAI 兼容服务即可。

## 技术栈

React 19 · Vite 8 · Tailwind CSS 4 · Express 4 · `@google/genai` · JSZip · lucide-react · Motion

## 目录

```
server.ts              Express 入口 + Gemini 反推接口（/api）
src/App.tsx            应用状态与流水线编排
src/components/        Sidebar / Workspace / Preprocess / PromptLab / Review / Export / Settings
src/data/modelSpecs.ts 各模型语法蓝图
src/services/          promptApi（调用与超时/重试）、providerEngine（服务商与协议适配）
src/utils/             提示词构建、lint、图像处理、IndexedDB 存储
```

## 说明

仓库前身是同一工具的旧版实现，历史提交保留在 git 里；当前 `main` 指向这一版重写。
