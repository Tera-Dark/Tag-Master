# 提交准备报告

> 状态说明：本报告记录提交准备阶段的验收。后续 GitHub 提交尝试与本地分支状态见 [GITHUB_SUBMISSION.md](GITHUB_SUBMISSION.md)。

日期：2026-09-14。范围：前两轮综合优化、全局极简 UI、API 设置升级，加上本轮日常使用 QoL 与工作区整理。

## 当前结论

**本地检查通过，已整理为待人工审阅的 GitHub 提交包。没有暂存、commit、push 或部署。**

这不是对真实服务商、Windows、全浏览器或生产负载的验收承诺。推送前仍应检查远端与目标分支、许可证和部署权限。

## 本轮 QoL

| 场景 | 修复 / 优化 | 验证 |
|---|---|---|
| 导入图片 | 开始、完成、空结果、失败反馈；阻止重叠导入；失败后重置文件选择器，允许重选同一文件 | Hook 测试 + 浏览器导入 |
| 导入中断 | 捕获 UI 事件中的异常，提示已导入内容保留，提醒重试时避免重复导入 | 模拟失败与恢复测试 |
| 设置草稿 | 关闭按钮、取消、Esc、点击遮罩均经过未保存确认；取消确认继续编辑；无修改不打扰 | 浏览器关闭 / 继续 / 放弃 / 重开 |
| 页面离开 | 打开的设置存在未保存修改时注册 beforeunload 提醒；项目存储保留原有保存状态保护 | 实现审阅；浏览器是否展示离开提示受平台策略影响 |
| 快捷键 | 不穿透模态框，不抢占 input / textarea / select / contenteditable、组合输入或已处理事件 | 单元测试 + 浏览器背景选择检查 |
| 编辑切图 | Alt＋左右键仅在 caption 编辑区切图，不从设置正文或其他表单触发 | 浏览器真实切图 |
| 删除键 | 忽略按住删除键产生的重复 keydown，减少重复确认排队 | 单元测试 |
| 屏蔽词 / 触发词 | 作为字面文本处理，而非拼接到正则；支持 `[token]`、`c++`、`a.b`、括号、反斜线与 Unicode；不误删其他单词子串 | 单元测试 + 原打标 Hook 回归 |
| Windows 启动 | 使用无乱码提示，定位脚本目录，检查 Node，首次缺少依赖时执行 npm ci | 静态审阅，未在 Windows 实机执行 |

没有在本轮添加云同步、全局撤销栈、触摸裁剪重写、OAuth 或新的收费服务集成。

## 项目整理

- 源码唯一工作目录仍为 `/home/user/Tag-Master`，保留 Git 历史和全部未提交修改。
- 删除原来被 Git 跟踪的两个生成缓存文件：`.vite/deps/_metadata.json`、`.vite/deps/package.json`。这是有意的待提交删除，不是源代码丢失。
- 浏览器截图、测试导出 ZIP 从 `docs/` 移到 `artifacts/`；通过 `.gitignore` 排除源码提交。
- 验证结果快照保存在 `docs/validation/`，合成测试素材保存在 `scripts/fixtures/`，便于复现。
- README 重写为与当前实现一致的入口，移除未经本轮测量支持的性能百分比和绝对保证。
- 增加 `CONTRIBUTING.md`、`SECURITY.md`、`CHANGELOG.md`、`.nvmrc`、`.prettierignore`。
- package.json 与 lockfile 的 Node 要求统一到 22+；CI 使用 Node 22。
- 增加 `check:release`：检查将进入提交的源码文件中常见凭证模式、生成物、大文件与冲突标记；只检查，不暂存或提交。
- CI 增加浏览器回归任务与独立证据 artifact；现有 Pages 部署流程保留。云端 Actions 尚未实际运行。

上轮历史报告保留，相关证据链接更新。API 报告中的 113 项测试是上一阶段计数，当前总数见下表。

## 最终本地验证

在 **Node.js v22.23.2** 下重新执行 `npm ci` 后验证，未依赖旧的 node_modules 状态。

| 检查 | 结果 |
|---|---|
| 锁定依赖安装 `npm ci` | 通过 |
| TypeScript 两份配置 | 通过 |
| ESLint | 0 错误 / 0 警告 |
| UI 风格检查 | 36 个界面源文件通过 |
| 单元 / 组件 / Hook 测试 | **131 项 / 13 个测试文件通过** |
| Vite 生产构建与 PWA 生成 | 通过 |
| 原工作流 Chromium 回归 | **29 个检查点，errors: []** |
| API Chromium 回归 | **24 个断言，errors: []**，模拟四协议，不调用真实服务 |
| QoL Chromium 回归 | **7 个检查点，errors: []** |
| npm audit --omit=dev | 0 项漏洞（当次数据库结果） |
| 待提交文件卫生检查 | 通过，未命中内置规则 |
| git diff --check | 通过 |
| 暂存区 | 保持为空 |

结果快照：

- [原工作流](validation/workflow-browser.json)
- [API 配置](validation/api-browser.json)
- [QoL](validation/qol-browser.json)

全套浏览器验证合计 60 个检查点 / 断言，使用 Chromium 及合成素材。API 结果是模拟响应，不代表真实服务商验收。

## 尚需人工决定或目标环境确认

1. **远端与分支**：确认有权提交到目标仓库。推送 main / master 可能触发现有 Pages 部署。
2. **许可证**：当前仓库没有新增 LICENSE；由仓库所有者决定，不擅自给上游代码重新授权。
3. **真实 API**：用你自己的账号验证权限、地址、CORS、成本和标注质量；不要把密钥提交到 GitHub。
4. **Windows / Safari / Firefox**：本轮未进行实机 / 全套跨浏览器测试；Windows 启动脚本只做静态检查。
5. **依赖维护**：安装时仍有部分开发工具链弃用提示（source-map beta、glob、ESLint）。本次安装与构建通过、审计未报漏洞，但不把弃用提示视为已解决；后续应按兼容范围升级，不盲目覆盖传递依赖。
6. **大数据量与触摸裁剪**：未做长期压力测试；原裁剪拖拽仍主要面向鼠标。
7. **安全审阅**：提交扫描是启发式的，不是完整密钥历史扫描或安全审计。

## 建议提交

建议把当前交叉修改作为一个完整、已验证的提交，消息可用：

```text
feat: refine dataset workspace UX and provider configuration
```

人工复核后执行的命令与注意事项见 [CONTRIBUTING.md](../CONTRIBUTING.md)。本轮没有代替你执行这些 Git 写操作。
