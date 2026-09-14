# Tag Master

极简的图片数据集整理与 AI 打标工作台。基于 React 19、TypeScript、Vite 和 Tailwind CSS，串联 **导入 → 预处理 → 打标 → 审查 → 导出**。

## 主要功能

- **项目与素材**：多项目管理、拖放图片 / 文件夹、虚拟化画廊、选择与筛选、裁剪和批量处理。
- **AI 打标**：Gemini、OpenAI Chat Completions、OpenAI Responses、Anthropic Messages；支持兼容网关与本地免密接口。
- **清晰的配置流程**：选择服务商、填写连接、导入或手动添加模型、测试图片调用、指定打标模型、保存。浏览和测试不会切换当前打标模型。
- **标注格式**：纯标签（默认）、自然语言、标签＋描述；支持自定义指令与预设，保留用户编辑过的旧指令。
- **审查与导出**：标签编辑、批量清洗、项目触发词、TXT / JSON 和 ZIP 数据集导出。
- **交互保护**：导入反馈与失败恢复、设置草稿关闭确认、输入区域快捷键隔离、保存状态反馈、浅色 / 深色与移动端布局。

默认打标模型为 `gemini-3.8-flash`。官方模板另提供 `gpt-5.6-terra`、`gpt-5.4-mini`、`claude-sonnet-5`（目录更新于 2026-09-14）。预设不代表账号权限；实际可用型号以服务商文档及测试结果为准。

## 本地运行

需要 **Node.js 22 或更新版本**。推荐使用 Node.js 22 LTS，与 CI 保持一致。

```bash
npm ci
npm run dev
```

浏览器打开终端显示的地址，默认 `http://localhost:5173`。Windows 可双击 `start.bat`：检查 Node 版本、在缺少依赖时运行 `npm ci`，再启动开发服务。已有依赖时，更新代码后仍建议手动执行 `npm ci`。

```bash
npm run build       # 生产构建
npm run preview     # 本地检查构建结果，不是生产 API 代理
```

## API 与隐私

在「设置 → 模型服务」配置 API，**不要把密钥写入 `VITE_*` 环境变量、源码或 Git 仓库**。

- 项目保存在浏览器 IndexedDB；设置保存在 localStorage。Base64 不是加密保险库。
- AI 打标会将处理后的图片发往你配置的服务商。图片诊断只发送内置色块，但仍可能计费。
- 浏览器直连受 CORS、混合内容和本地网络策略限制。Ollama / LM Studio 模板使用 OpenAI 兼容 `/v1`，`localhost` 指浏览器所在电脑。
- 可通过 `.env.example` 中的 `TAG_MASTER_PROXY_ORIGINS` 显式启用本地开发代理，只允许指定的可信 HTTPS 来源。不要公开暴露开发服务器；生产构建不提供此代理。
- 清理浏览器数据会删除本地项目和配置。保存状态异常时，优先导出备份，不要直接清空数据。

详细配置、参数兼容范围和迁移规则见 [API 配置说明](docs/API_CONFIGURATION.md)。安全边界见 [SECURITY.md](SECURITY.md)。

## 验证与开发

```bash
npm run check           # 类型检查、Lint、UI 规范、单元测试、生产构建
npm run check:release   # 待提交文件卫生检查；不暂存、不提交、不推送

# 另开一个终端启动 npm run dev -- --port 5173
npx playwright install chromium
npm run test:ui         # 全工作流浏览器回归
npm run test:api-ui     # 模拟 API 设置回归，不使用真实密钥
npm run test:qol-ui     # 导入、草稿保护与快捷键回归
```

浏览器截图和下载样本写入 `artifacts/`，已被 Git 忽略；小型验证结果位于 `docs/validation/`。测试流程、目录约定和 GitHub 提交步骤见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 文档

- [当前发布准备报告](docs/RELEASE_READINESS.md)
- [变更记录](CHANGELOG.md)
- [架构说明](docs/ARCHITECTURE.md)
- [API 配置与迁移](docs/API_CONFIGURATION.md)
- [上一轮极简 UI 记录](docs/UI_REDESIGN.md)
- [早期综合优化记录](docs/OPTIMIZATION_REPORT.md)

## 已知边界

- 自动化 API 回归使用模拟响应，不能替代真实服务商权限、网络、费用和标注质量验证。
- 浏览器图片解码支持因格式和平台而异；图片被导入不等于一定能正常预览或打标。
- 移动端可以管理与编辑；现有裁剪拖拽仍以鼠标操作为主。
- 没有承诺全浏览器兼容、无限大数据集性能或无条件的数据恢复能力。重要素材请保留原件并定期导出。
- 公开发布前，请由仓库所有者决定许可证。当前仓库未新增 LICENSE，不擅自指定上游代码的授权方式。

上游：[Tera-Dark/Tag-Master](https://github.com/Tera-Dark/Tag-Master)。本轮变更已整理为工作区本地提交，尚未推送或部署；原仓库的线上版本不代表本轮改动。
