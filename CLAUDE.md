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

2. **本地样式打包 (Local CSS & Tailwind)**：
   - 严禁在 `index.html` 中以外部 CDN 脚本形式引入 TailwindCSS。
   - 所有 Tailwind 配置必须维护在本地的 `tailwind.config.js` 和 `postcss.config.js` (使用 `@tailwindcss/postcss` 以兼容 Tailwind v4) 中。
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
