# Tag Master — AI 开发守则 (CLAUDE.md)

本文件定义了 Tag Master 项目的构建指令、代码守则以及核心架构原则。请在修改项目时严格遵守。

---

## 🚀 常用开发命令

- **安装依赖**: `npm install`
- **启动本地开发服务器**: `npm run dev`
- **生产环境打包**: `npm run build` (类型校验通过后，使用 Vite 编译)
- **静态类型检查**: `npx tsc --noEmit`
- **代码风格检查**: `npm run lint`
- **运行单元测试**: `npx vitest run`

---

## 📐 代码风格与规范

- **类型安全**: 严格开启 TypeScript 类型约束。不可裸用 `any`。在 `tsconfig.json` 中，`noUnusedLocals` 和 `noUnusedParameters` 为 `true`，未使用的变量及参数会在静态检查时报错。
- **Linting & Formatting**: 运行 `npm run lint` 验证。采用 ESLint + Prettier，代码需通过严格检查才能提交。
- **i18n 多语言**: 核心 UI 文本必须通过 `t()` 翻译，不要直接在 UI 组件中 hardcode 中文或英文文本。i18n 资源文件位于 `src/locales/`。

---

## 🚨 核心架构原则与防雷红线

1. **预览图内存回收 (Memory Revocation)**：
   - 应用使用 `URL.createObjectURL(file)` 创建瞬时本地预览图链接。
   - **红线**：在任何删除图片（`removeImages`）、删除项目（`deleteProject`）、清除已打标（`clearDone`）或更新单张图片（`handleImageUpdate`）的逻辑中，**必须先显式调用 `URL.revokeObjectURL(previewUrl)`** 释放系统底层内存，避免大数据集场景下内存暴涨导致 OOM 崩溃。

2. **本地样式打包 (Local CSS & Tailwind v4)**：
   - 严禁在 `index.html` 中以外部 CDN 脚本形式引入 TailwindCSS 或内联全局样式。
   - 所有 Tailwind 配置采用 Tailwind v4 原生 CSS 规范维护在 `src/index.css`（包含 `@custom-variant dark` 与 `@theme` 扩展）和 `postcss.config.js` (`@tailwindcss/postcss`) 中，不再依赖旧版 `tailwind.config.js`。
   - 样式入口位于 `src/index.css`，并在 `src/index.tsx` 中导入以参与打包编译，从而确保应用 100% 具备离线可用能力。

3. **IndexedDB 增量同步保存 (Incremental Sync)**：
   - 项目在本地 IndexedDB 中的持久化必须使用 `storageService.ts` 导出的 `syncProjectsIncrementally(updated, deletedIds)` 接口。
   - **红线**：严禁在自动保存的 `useEffect` 中执行清空整张表再全量覆盖的暴力同步操作。应使用 React 状态的 Immutable 引用对比机制（`prevProjectsRef`），仅对引用改变（或新增）的项目和被删除的项目执行写入或删除，以降低 90%+ 的大图片文件 I/O 序列化开销。

4. **打标图像非阻塞智能压缩 (Vision Input Compress)**：
   - 发送 Vision 大模型请求前，须通过 `processImage` 对图片进行非阻塞尺寸限制。
   - 缩放优先采用 `createImageBitmap` + `OffscreenCanvas`（如果支持）在后台线程进行解码和 JPEG (0.85 质量) 编码，最大边限制为 1536 像素，避免阻塞主线程 UI 渲染。

5. **绝对定位下拉防裁剪规范 (Overflow Visible)**：
   - 包含绝对定位（`absolute`）下拉浮层的容器组件（如 `SmartToolbar`），在需要支持浮层溢出显示时，**严禁设置 `overflow-x-auto` 或 `overflow-hidden`**，否则下拉浮层在垂直方向会被物理裁剪遮挡。必须设置为 `overflow-visible` 确保交互菜单可见。

6. **React Hook 函数声明与依赖规范 (Declaration Order)**：
   - 在自定义 Hook (如 `useSelectionManager.ts`) 中，在 `useCallback` 的依赖数组中被引用的函数（如 `clearSelection`），**其物理声明顺序必须早于调用或引用它的 Hook**，以避免在 Vite 生产构建 (tsc) 静态分析时因“声明前使用”导致 TS2448 / TS2454 编译阻断。

7. **多模型协议分流规范 (Dual Protocol Dispatch)**：
   - 外部调用须通过 `geminiService.ts` 导出的 `generateCaption`，系统通过 `settings.protocol` (`google` 或 `openai_compatible`) 分流至对应的多模态 payload 构建逻辑。添加新模型提供商时，严禁破坏已有的通用 OpenAI / Google 协议规范。

8. **网格列数与缩放防覆盖规范 (Columns Setting Persistence)**：
   - 网格列数范围固定为 3 到 8（默认 5），由 `useSettings` 的 `clampColumns` 规范。严禁在根组件的 `window.onresize` 监听器中盲目调用 `setSettings({ gridColumns })` 覆盖用户的个性化设定。

9. **API 速率限制与 429 自动轮询保护规范 (Rate Limit & 429 Resilience)**：
   - 遭遇 Google AI Studio (5 RPM / 250k TPM) 等配额耗尽或 HTTP 429 `RESOURCE_EXHAUSTED` 时，**严禁将图片标为红字 `error`，严禁递增 `consecutiveErrors` 触发 5 次连续错误强行中断任务**。
   - 必须通过 `RateLimitError` 携带 `retryAfterSec`，将当前图片任务重新推回队首保持待处理态，并设置全局冷却时间戳 `coolingUntilRef`，通过倒计时轮询后无缝自动恢复继续打标，确保挂机任务零人工干预。

10. **即时暂停与网络超时隔离规范 (AbortController & Timeout Disambiguation)**：
    - 批处理暂停必须基于 `AbortController` 深度绑定底层 `fetch` 与中断式休眠 `sleepWithSignal`，确保用户点击「暂停」时毫秒级停止，在途请求图片优雅回滚为 `idle`。
    - **红线**：严禁将底层请求 60s 产生的网络超时 `AbortError` 混同为用户主动点击暂停。只有 `userAbortSignal.aborted === true` 或 `shouldStopRef.current === true` 时才允许退出 Worker 并标记暂停；对于网络超时，必须抛出显式超时异常并在图片上标记 `error`，以避免任务静默中断。

11. **单张生成与批量停止锁隔离规范 (Single Regeneration & Batch Isolation)**：
    - 单张打标/重新生成（`handleTagSingle`）是独立的即时操作，**严禁受批量控制锁（`shouldStopRef`）干扰或阻塞**；底层生成逻辑只响应专属的 `AbortSignal`。
    - **红线**：对已有结果重新生成时，必须先对原状态与提示词进行快照备份；若遇到异常或未配置 Key，必须无损回滚原有状态，严禁将原有的 `success`（绿勾标）误刷为 `idle`。

12. **服务商预设保护与动态色彩规范 (Provider Defaults & Color Safety)**：
    - 官方预设服务商（Google Gemini、OpenAI、SiliconFlow）带有 `isSystem: true`，严禁允许用户物理删除。
    - 服务商头像 Hex 背景色必须使用 Inline Style 渲染以稳定支持 1677 万任意色（Tailwind JIT 无法预编译任意动态 Hex 类名），并根据背景色亮度算法动态计算前景色（黑/白），确保文字在任何底色下均清晰可读。

---

## 📚 深入架构文档

| 文档 | 职责定位与内容概要 |
|---|---|
| [`docs/ARCHITECTURE.md`](file:///c:/Users/wjx19/Documents/GitHub/Tag-Master/docs/ARCHITECTURE.md) | 系统整体架构总览、目录职责、核心状态流、429 流控与超时状态机及防踩坑细节 |


