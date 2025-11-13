# render.messesum.com

面向 Messesum Builder 的安全渲染托管服务。服务端接收 `https://render.messesum.com/<template>/<token>` 形式的请求，携带 Token 调用 `app.messesum.com/builder/render/` 获取真实数据，然后将 HTML 模板与数据合成，最后生成 **图片化 PDF** 并嵌入不可见水印，防止内容被篡改或伪造。

## 核心特性
- **Next.js 16 App Router**：原生 SSR/ISR，Node Runtime 下可无缝运行 Puppeteer、pdf-lib 等 Node 生态。
- **模板安全沙箱**：模板位于 `template/`，通过 Mustache 渲染与 `sanitize-html` 清洗，仅保留白名单标签与属性。
- **自带企业级字体**：默认通过公共 CDN 拉取 Noto Sans SC（无 Google 依赖，可配置 `FONT_CDN_BASE`），`lib/fontLoader.ts` 自动嵌入 WOFF2 数据，保证服务器/边缘环境渲染一致。
- **图片化 PDF 防篡改**：Chromium 将 HTML 渲染为 PNG，再由 pdf-lib 写入 PDF；页面内容无法直接被复制修改。
- **请求元数据隐水印**：每一页 PDF 都写入 Token、requestId、IP、User-Agent、时间戳的旋转半透明文字，便于溯源。
- **临时调试入口**：`/haoutest` 页面便于在测试阶段组合模板/Token。

## 目录结构
```
app/                     Next.js App Router（主页、haoutest、动态渲染路由）
lib/                     核心逻辑（Chromium 启动、HTML 渲染、PDF 生成、安全校验等）
template/                Mustache HTML 模板（例如 pay_notice.html）
next.config.js           Next.js 配置
tsconfig.json            TypeScript 配置（Next.js 自动附加插件与 include）
eslint.config.mjs        ESLint Flat Config（基于 eslint-config-next）
```

## 环境要求
- Node.js ≥ 20.11
- npm ≥ 10
- 可执行的 Chrome/Chromium（本地调试），或部署在支持 @sparticuz/chromium 的 Lambda / Vercel 环境。

## 快速启动
```bash
npm install
npm run dev        # 开发模式
npm run lint       # ESLint 检查
npm run build      # 生产构建（含 TS 检查）
npm run start      # 启动生产环境
```

## 环境变量
| 变量 | 默认值 | 描述 |
| --- | --- | --- |
| `RENDER_DATA_ENDPOINT` | `https://app.messesum.com/builder/render/` | 上游 Builder 接口，POST `{ token }` 换取数据。 |
| `CHROME_EXECUTABLE_PATH` / `PUPPETEER_EXECUTABLE_PATH` | 自动探测 | 本地或自定义 Chrome 的绝对路径。 |
| `CHROMIUM_FORCE_AWS` / `CHROMIUM_FORCE_LOCAL` | 未设置 | 强制使用 @sparticuz/chromium 或本地浏览器。 |
| `ALLOW_HAOUTEST_DATA` | `true` | 是否允许 `/haoutest` 通过直接数据 JSON 生成 PDF；生产建议设为 `false`。 |
| `FONT_CDN_BASE` | `https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc/files` | 字体 CDN 根路径，默认使用 fontsource 托管的 Noto Sans SC（非 Google 源）；可自定义为任何可公开访问的中文字体地址。 |

## 渲染流程
1. **请求入口**：路由 `/<template>/<token>` 解码路径，使用严格正则验证模板名与 Token。
2. **上游取数**：`lib/fetchBuilderData.ts` 将 Token POST 到 Builder 接口，12s 超时，异常统一封装为 `RemoteDataError`。
3. **模板渲染**：`lib/htmlTemplate.ts` 加载 `template/<name>.html`，Mustache 渲染后由 `sanitize-html` 清洗，再注入字体与基础样式。
4. **图片化 PDF**：`lib/pdf.ts` 使用 Puppeteer-Core 渲染页面为 PNG，再用 `pdf-lib` 将 PNG 镶入 PDF。
5. **隐水印与响应**：PDF 每页叠加不可见戳记，最终以 `Content-Type: application/pdf`、`Cache-Control: no-store`、`Referrer-Policy: no-referrer` 返回。

## 模板与字体
- 模板语法为 Mustache，占位符形如 `{{field}}`。`pay_notice.html` 同时支持 `items` 数组与旧版 `itemN_*` 字段（在路由中自动转换为 `fallbackLineItems`）。
- 字体由 `lib/fontLoader.ts` 通过公共 CDN 拉取 Noto Sans SC 的 WOFF2 文件并注入 base64 数据 URI（默认基于 `FONT_CDN_BASE`，可指向任意合规的中文字体），因此无需把大体积字体放入仓库，也不依赖 Google Fonts。

## 隐藏请求元数据戳记
### 原理
- 生成 PDF 后，`lib/pdf.ts` 中的 `injectWatermark` 会以 260px × 140px 的网格，在每页绘制旋转 -30°、透明度 0.08 的文字。
- 文本内容包含：`render.messesum.com • token=<原始 Token> • request=<requestId> • ip=<真实 IP> • ua=<User-Agent>`，并在页脚补充 `ts=<ISO 时间戳>`。
- 由于 PDF 页面本质仍是矢量文字，即便肉眼难以察觉，技术手段仍可提取，达到追踪溯源的目的。

### 检查方式
1. **文本提取**：使用 `pdftotext file.pdf -` 或 `pdfgrep`，即可看到隐藏的水印文字行。
2. **PDF 编辑器**：在 Adobe Acrobat / Foxit 等工具中选择「编辑文本」，拖拽选区即可看到若隐若现的戳记。
3. **放大观察**：放大 400% 并切换到深色背景模式，旋转-30° 的浅灰文字会更明显。

> 若需要进一步强化防伪，可在 `injectWatermark` 中调整网格密度、颜色或叠加二维码/矢量图案。

## 调试入口 `/haoutest`
- **Token 模式**：默认与生产一致，按模板/Token 直接跳转 `/<template>/<token>`。
- **Data JSON 模式**：可粘贴上游 Builder 的响应数据（或手写字段），前端会 POST 到 `/api/haoutest/render`，由服务器直接生成 PDF。用于调试模板效果、无需真实 Token。
- `ALLOW_HAOUTEST_DATA=false` 时，Data 模式会被拒绝并返回 403。生产环境建议关闭或加鉴权。
- 上线前可根据需要移除/隐藏整个 haoutest 页面。

## 运营&部署提示
- 本地无 Chrome 时，可设置 `CHROME_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/...`。
- 若在 AWS Lambda 部署，建议设置 `CHROMIUM_FORCE_AWS=true`，强制使用 @sparticuz/chromium。
- 监控日志中出现的 `[requestId] render error` 可结合客户端返回的 `requestId` 快速定位问题。

## 后续可考虑
1. 健康检查 + 浏览器预热状态上报。
2. 大尺寸模板拆分为多页 PDF，或支持自动分页。
3. 引入模板版本/签名机制，避免未经审批的 HTML 被部署。

如需新增模板：直接在 `template/` 中放置 `*.html` 文件，路径即为 `<template>` 名称；确保遵循 Mustache 语法并只使用白名单标签，即可立即通过 `/模板名/<token>` 调用。 
