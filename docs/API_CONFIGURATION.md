# API 配置与打标指令升级

更新日期：2026-09-14。此报告针对本次 API 设置专项；上一轮全局极简 UI 的记录见 [UI_REDESIGN.md](UI_REDESIGN.md)。本报告替代其中旧版服务商设置与提示词预设的描述。

## 1. 本次范围与结果

按照“兼容性强，但基础操作简单”的方向，重构服务商设置、连接适配、模型管理、调用诊断和内置打标指令。继续使用全项目的中性极简设计系统。

**没有开展新的项目管理、导出、快捷键等 QoL 扩展；没有提交、推送或部署仓库。** 原有项目数据与工作流保留。

### 日常操作

1. 在「设置 → 模型服务」选择服务商；没有对应项就点「添加服务商」。
2. 填 API Key 和 API 地址。官方模板已给出协议、地址及少量模型预设。
3. 使用「获取模型」导入所需型号，或「手动添加」填写模型 ID。
4. 选择测试模型，运行一次「图片调用」。会发送内置 64×64 PNG 色块，不发送素材图片；请求仍可能计费。
5. 点击模型行的「设为打标模型」，最后「保存设置」。

**浏览服务商 ≠ 切换打标模型；测试 ≠ 保存；列表可见 ≠ 账号可调用。** 未保存的 API / 提示词编辑可通过「取消」放弃。主题保持原有即时预览行为，但不会再覆盖其他设置草稿。

## 2. 协议适配

| 协议                    | 默认调用路径                             | 默认鉴权                          | 图片格式                |
| ----------------------- | ---------------------------------------- | --------------------------------- | ----------------------- |
| Gemini GenerateContent  | `/v1beta/models/{model}:generateContent` | `x-goog-api-key`                  | `inlineData`，保留 MIME |
| OpenAI Chat Completions | `/v1/chat/completions`                   | `Authorization: Bearer`           | `image_url` data URL    |
| OpenAI Responses        | `/v1/responses`                          | `Authorization: Bearer`           | `input_image` data URL  |
| Anthropic Messages      | `/v1/messages`                           | `x-api-key` + `anthropic-version` | base64 `image.source`   |

Google 的生成、模型发现和诊断现在均使用配置的地址与请求头，不再写死官方服务器，也不再把 API Key 拼入 URL。

### 地址规则

- 只填写主机根地址时，补充协议默认版本路径。
- 已有路径时，将其当作完整 API 前缀保留，不随意插入 `/v1`。
- 标准完整调用端点自动识别；协议与标准端点不匹配时明确报错。
- 高级设置可选择“完整端点”，用于非标准网关或 Azure 等部署路径；查询参数如 `api-version` 保留。
- 模型列表 URL 可单独指定，但必须与调用地址同源，避免凭证发往另一站点。
- 非标准完整端点无法推断列表地址时，明确要求填写列表 URL；也可以直接手动添加模型。
- URL 不允许内嵌用户名、密码、片段和常见密钥查询参数；缺少地址时拒绝调用，不把自定义密钥发往隐含默认服务。

示例：

| API 地址 / 协议                                                   | 实际调用地址                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `https://host.example` / Chat                                     | `https://host.example/v1/chat/completions`                                 |
| `https://host.example/gateway/v1` / Chat                          | `https://host.example/gateway/v1/chat/completions`                         |
| `https://generativelanguage.googleapis.com/v1beta/openai/` / Chat | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `https://host.example/google/v1beta` / Gemini                     | `https://host.example/google/v1beta/models/{model}:generateContent`        |
| `https://host.example/custom/action?api-version=1` / 完整端点     | 原样使用，Google 标准模型路径会跟随选中的模型 ID                           |

这些示例是路径解析规则，不代表已经对相应真实服务完成连通验证。

### 高级选项

- 自动鉴权、Bearer、`x-api-key`、`api-key` 或无需鉴权。
- 同名自定义请求头按大小写不敏感规则覆盖默认头；浏览器禁止的头会被拒绝。
- 请求超时：默认 90 秒，可设 5–600 秒，覆盖响应体读取阶段。
- 最大输出：默认 4096 tokens；请遵守具体模型限制，推理输出也可能消耗预算。
- JSON 请求扩展：可添加服务商参数，不能覆盖 `model`、图片、提示词载体，不能开启流式输出。无效 JSON 在调用前拦截，保存时也不会静默忽略。
- Gemini 3 系列默认 `thinkingLevel: low`，不使用 Gemini 3.8 不支持的 `minimal`。旧 Gemini 型号不套用此字段。
- Claude Sonnet 5 默认关闭思考，不发送非默认 sampling 参数或手动 thinking budget。
- Chat 中 GPT-5 / o 系列使用 `max_completion_tokens`，普通兼容模型使用 `max_tokens`；Responses 使用 `max_output_tokens`，并默认 `store: false`。

### 本地服务与兼容边界

提供 Ollama、LM Studio 的 **OpenAI 兼容 `/v1` 模板**，支持无需密钥。这里的 `localhost` 指打开应用的浏览器所在电脑，不是任意远程预览服务器。

这不是 Cherry Studio 桌面端：浏览器仍受 CORS、混合内容、局域网访问策略等限制。没有实现 Ollama 原生 `/api/chat`、Vertex 服务账号、Bedrock 签名或 OAuth 自动续期；Azure 可用手动鉴权及完整端点配置，但未做真实 Azure 验证。某些网关需要额外参数，不能承诺“任意兼容服务零配置可用”。

## 3. 模型管理与诊断

### 内置模型

新安装默认：

- Google：**`gemini-3.8-flash`**，当前默认打标模型。
- OpenAI：`gpt-5.6-terra`、`gpt-5.4-mini`；新建官方模板使用 Responses。
- Anthropic：`claude-sonnet-5`。

这些是小而明确的预设，不是完整模型目录、账号授权声明或价格推荐。OpenRouter、SiliconFlow、本地服务和自定义网关不强塞可能不存在的模型 ID，使用发现或手动添加。

### 发现

- Google、Anthropic 及常见兼容格式使用共享网络层，支持取消、超时及相应分页字段。
- 接受 `data`、`models` 或数组列表；识别常见输入 / 输出模态元数据。
- 防止分页循环；最多 20 页、10,000 项，超限明确报错，不假装返回完整列表。
- 弹窗支持搜索、排除已知非图片打标模型、勾选后添加。大列表最多展示 250 个匹配项，提示缩小搜索。
- 导入是追加式的，不覆盖已有手动模型与能力设置。

### 能力与测试

界面区分“平台声明 / 内置预设 / 名称推测 / 手动指定 / 待确认”。未知能力不会直接标成纯文本；设置未知模型前要求确认。已知图片生成、embedding、语音等模型不作为图片转文字打标推荐。

“图片请求已接受并返回文本”仅说明该请求被接受且解析到了文本；不证明模型准确理解所有图片或符合训练质量要求。纯文本测试不宣称验证了图片能力。切换连接参数、服务商、测试模型或测试类型会清除旧结果并取消旧请求。

### 响应与错误

- 汇总多段可见文本，跳过 reasoning / thought 内容。
- 识别拒绝、内容拦截、截断、空文本和协议不兼容，不将这些结果当作成功标注保存。
- 单次底层调用不重试；批量流程统一处理重试与 429 冷却，避免原来嵌套重试成倍放大调用次数。
- 保留 `Retry-After`、Google retryDelay 等提示，支持 HTTP 日期形式及非 JSON 的 429 响应。
- 错误中对配置密钥和自定义请求头值做脱敏；不记录完整设置或测试请求体。
- 停止请求不能撤销服务端已经处理的工作，亦不能保证取消费用。

## 4. 数据集提示词 v3

| 预设           | 输出契约                         | 使用方向                   |
| -------------- | -------------------------------- | -------------------------- |
| 纯标签（默认） | 单行，小写英文，逗号＋空格分隔   | 标签型训练配方             |
| 自然语言       | 一个客观英文段落，简单图片可更短 | 描述型训练配方             |
| 标签＋描述     | 标签行，空一行，再一个段落       | 明确需要混合格式的训练配方 |

共同原则：只写可见内容，省略不确定细节，不推测隐藏属性，不强凑数量，不加质量词、宣传性表述、Markdown、负面提示或生成参数。

删除旧预设中固定 Medusa 案例和“工业黄金标准 / 强制大量标签”等描述。示例只用于界面展示，不作为 few-shot 素材发送给模型。内置标签输出做基础去重、逗号分隔、小写与空格规范化；**编辑过的自定义指令不做这类隐式重排**。

支持另存为预设、选择及删除自定义预设，删除预设不删除当前正文。项目触发词仍由原工作流添加。格式指令不能保证模型百分之百遵守，仍需要人工审查。

## 5. 迁移与数据保留

- 继续读取 v9 / v8 设置的 JSON 或 Base64 格式。
- 旧单服务商顶层配置迁入服务商对象，保留地址、密钥、模型、请求头和高级字段。
- 使用服务商对象作为当前连接的权威来源，原顶层字段作为同步投影，避免“界面编辑了 A，打标仍请求 B”。
- 现有服务商及自定义模型保留。官方 Google 的旧 bundled 默认选择可升级到 Gemini 3.8 Flash；原 ID 仍保留在列表。自定义地址、明确手动模型和能力设置不自动替换。
- 最新官方预设追加到相应旧官方目录，现有 OpenAI 协议和已选型号不被强制改写。
- 只对**精确匹配旧内置文本**的 A/B/D 指令做迁移；哪怕多一个空格也按用户编辑保留。旧 Midjourney 导向的 Mode C 因语义不同，保留为自定义指令。
- 所有自定义预设文本原样保留，不使用“包含旧版本字样就覆盖”的猜测逻辑。
- 删除当前服务商会清空打标选择，要求用户重新指定；不会偷偷切换到另一家并发请求。

## 6. 隐私与代理

这是本地浏览器应用，不是加密凭证保险库。Base64 是编码，不是加密。不要在共享电脑、非可信部署或仓库中存放真实密钥。

生成会把处理后的素材图片发往配置的 API。诊断仅用内置色块。默认没有公共代理，也不提供生产版服务端凭证托管。

开发代理由 `TAG_MASTER_PROXY_ORIGINS` 显式启用，只允许配置的精确 HTTPS origin。配置后直接走该代理，不在网络 / CORS 失败后自动补发第二个付费请求；未配置则直连且不猜测代理。请求不跟随重定向。不要将开发服务器暴露给不可信用户。

## 7. 实施文件

- `src/services/providers/connection.ts`：端点、鉴权、连接验证、当前配置投影、统一请求与脱敏。
- `src/services/providers/generation.ts`：四种协议的请求体与响应解析。
- `src/services/providers/errors.ts`：错误分类和冷却提示。
- `src/services/providers/catalog.ts`：服务商模板和版本化的小型模型目录。
- `src/services/providers/settingsMigration.ts`：默认值与非破坏式迁移。
- `src/services/providers/legacyPrompts.json`：仅用于精确迁移的旧内置文本。
- `src/services/modelDetector.ts`：能力来源、发现与分页；保留旧函数入口。
- `src/services/geminiService.ts`：兼容原调用入口，实际转发到统一协议层。
- `src/components/modals/settings/api/`：连接表单与模型管理。
- `ModelSettingsTab` / `PromptSettingsTab` / `AddProviderModal` / `SettingsModal`：新的设置流程。
- `useSettings` / `useTagProcessor` / `networkUtils`：持久化、免密预检及单层重试衔接。

## 8. 验证记录

执行环境：Node.js 22、Chromium；桌面 1440×960，移动视口 390×844。

- `npm run check`：两份 TypeScript 配置、ESLint 零警告、36 个界面文件的 UI 风格检查、**113 项测试 / 11 个测试文件**、生产构建与 PWA 生成，全部通过。
- `npm run test:ui`：**29 个原工作流检查点**，`errors: []`，包括真实的合成图片导入和 ZIP 下载。
- `npm run test:api-ui`：**24 个 API / 设置行为断言**，`errors: []`，7 次拦截的模拟请求，四种协议均覆盖。
- `npm audit --omit=dev`：0 项漏洞。
- `git diff --check`：通过。

API 浏览器验证覆盖：服务商浏览不切换、Google 自定义地址与头、图片调用、分页导入、未知能力确认、主题变更保留草稿、原子保存与重载、Responses / Messages、本地免密、取消测试、无效 JSON 拦截及禁止静默保存、自定义预设保留、移动端无横向溢出、取消丢弃草稿。

过程中发现并修复了服务商切换时的重复 React key 导致旧表单残留，以及 JSON 编辑器的可访问名称不稳定问题。浏览器专项同时检查运行时异常和 React 控制台错误。

证据：

- [API 浏览器断言结果](validation/api-browser.json)
- [原工作流浏览器结果](validation/workflow-browser.json)
- `artifacts/api-previews/`：17 张实际浏览器截图，包含浅色 / 深色、四协议、模型发现、手动添加与移动端。

### 未验证边界

**没有使用真实 API Key，没有真实付费调用。** 未实测各服务商的账户权限、跨区域网络、真实 CORS 策略、输出质量、价格、长时间大批量负载或全部网关实现；未做 Firefox / Safari 的全套验证。原有移动裁剪等非本次范围的限制仍以 UI 报告为准。

## 9. 模型与接口依据

检查时间为 2026-09-14。模型目录会继续变化，下面是本次选择预设和参数时参考的官方入口：

- Gemini 3.8 Flash：<https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash>
- Gemini GenerateContent：<https://ai.google.dev/api/generate-content>
- Gemini OpenAI 兼容入口：<https://ai.google.dev/gemini-api/docs/openai>
- OpenAI GPT-5.6 Terra：<https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- OpenAI 变更记录：<https://developers.openai.com/api/docs/changelog>
- OpenAI 弃用记录：<https://developers.openai.com/api/docs/deprecations>
- Claude Sonnet 5：<https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5>
- Cherry Studio 服务商配置流程参考：<https://docs.cherryai.com.cn/docs/en-us/pre-basic/providers>

以上用于核对型号、协议与参数，不代表本站提供这些服务或保证未来可用性。

> 收尾更新：截图和下载样本现写入 Git 忽略的 `artifacts/`。当前结果以 [发布准备报告](RELEASE_READINESS.md) 为准；本报告保留 API 专项完成时的测试计数。取消未保存设置现在需要确认。
