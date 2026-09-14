# 开发与提交说明

## 环境

使用 Node.js 22（`.nvmrc`），通过 `npm ci` 安装锁定依赖。不要提交 API Key、`.env.local`、浏览器项目数据或生成物。

## 目录

| 路径                      | 用途                               |
| ------------------------- | ---------------------------------- |
| `src/components/`         | 工作流、设置、可访问弹窗与 UI      |
| `src/hooks/`              | 项目持久化、选择、导入、打标调度   |
| `src/services/providers/` | 四协议适配、鉴权、模型预设、迁移   |
| `src/utils/`              | 字面量标签与快捷键等公共逻辑       |
| `public/`                 | 应用图标与静态资源                 |
| `scripts/`                | UI / API / QoL 回归、提交前检查    |
| `scripts/fixtures/`       | 可提交的合成测试素材，不含用户图片 |
| `docs/`                   | 架构、使用说明、历史阶段报告       |
| `docs/validation/`        | 经验证的小型结果快照，不包含凭证   |
| `artifacts/`              | 本地生成的截图与测试下载，Git 忽略 |

`CLAUDE.md` 保留为既有开发指引。涉及当前协议与命令时，以 README、API 配置说明及本文件为准。

## 检查

1. `npm run check`
2. 启动开发服务后执行 `npm run test:ui`、`npm run test:api-ui`、`npm run test:qol-ui`。
3. `npm run check:release`，再人工检查 `git diff` 和 `git status --short`。
4. 如需更新验证快照，检查结果确实属于当前源码后，将 `artifacts/*/browser-check.json` 复制到对应 `docs/validation/` 文件。不要把截图、下载 ZIP、实际素材或日志复制进源码目录。

提交前扫描只覆盖待提交文件的常见凭证模式、生成物、冲突标记和大文件，不是完整安全审计，也不检查全部 Git 历史。

## 建议提交方式

本工作区包含多轮尚未提交的交叉修改，建议先作为一个可验证的整体提交；如果要拆分，请交互式暂存并逐个验证，避免按目录粗拆导致中间提交无法构建。

下面仅是供仓库所有者审阅后手动执行的命令，自动检查不会运行这些操作：

```bash
git status --short
git diff --stat
npm run check:release
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: refine dataset workspace UX and provider configuration"
# 确认远端仓库、目标分支和自动部署设置后再执行：
# git push origin HEAD
```

推送 `main` / `master` 可能触发现有 GitHub Pages 工作流。公开仓库前还需确认上游授权、许可证、部署权限和 API 使用提示；不把“构建通过”等同于完成上线审批。
