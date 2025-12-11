<div align="center">
   <img src="https://github.com/jorben/pptmaker/blob/main/public/pptmaker.png" alt="PPTMaker" />
</div>

# PPTMaker

[English](README.md) | [简体中文](README_zh.md)

AI 驱动的演示文稿生成器，支持上传/粘贴文本或 PDF/Word/Markdown/TXT，自动规划大纲、生成视觉稿，并提供可视化编辑与一键导出 PDF 的体验。支持 Google VertexAI 兼容与 OpenAI 兼容 API，两种请求模式（前端直连 / 服务端中转）可选，配置保存在浏览器 localStorage。

## 功能特性

- **多语言 UI**：中英双语切换，界面语言可记忆到 localStorage。
- **多源输入**：支持粘贴文本、上传 PDF（Base64 直传）与 DOCX（内置 mammoth 解析），或其他文本类文件。
- **可配置生成**：自定义页数（或自动判定）、输出语言、视觉风格（极简/详细/自定义）、附加提示语，分别指定内容模型与图片模型。
- **双协议/双模式**：VertexAI 兼容或 OpenAI 兼容；可选浏览器直连或 Next.js API 路由中转。
- **流式规划与进度提示**：大纲规划流式返回，进度条展示阶段性进度。
- **生成与编辑**：逐页生成图片，可手动调整标题/要点/视觉描述，支持单页重绘。
- **打印与导出**：支持打印视图，使用浏览器打印对话框导出 PDF。

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+（项目使用 npm scripts）

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

访问：http://localhost:3000

### 生产构建

```bash
npm run build
npm start
```

### Cloudflare 部署（可选）

项目内置 OpenNext + Wrangler 脚本：

- 预览：`npm run cf-dev`
- 构建：`npm run cf-build`
- 发布：`npm run cf-deploy`

## API 配置（首次必需）

启动后会弹出 API 配置弹窗，配置项存于浏览器 localStorage：

1. 选择协议：VertexAI 兼容 / OpenAI 兼容。
2. 选择请求模式：
   - Client Direct：前端直接请求你配置的 API Base。
   - Server Proxy：通过 Next.js API 路由 `/api/plan`、`/api/gen` 中转。
3. 填写 API Key、API Base、内容模型 ID、图片模型 ID。
4. 点击 Continue 保存。

默认模型建议（仅示例，可按实际服务替换）：

- 内容模型：`gemini-2.5-flash`（或 OpenAI 兼容模型，如 `gpt-4.1` 等）
- 图片模型：`gemini-2.5-flash-image`（或 OpenAI 兼容的图像模型）

## 使用流程

1. **输入素材**：粘贴文本或上传文件（PDF/DOCX/MD/TXT）。
2. **风格与参数**：选择视觉风格、页数（或自动）、输出语言、附加要求。
3. **生成大纲**：进入规划阶段，实时展示流式结果。
4. **审阅大纲**：可增删页面、修改标题/要点/视觉描述。
5. **生成图片**：逐页生成视觉稿，进度实时更新，失败可单页重试。
6. **编辑与导出**：在编辑器中调整内容，支持打印视图并通过浏览器导出 PDF。

## 目录结构（核心）

```
├── app/
│   ├── layout.tsx              # 根布局，加载 mammoth 脚本
│   ├── page.tsx                # 主流程：多步骤状态管理与 UI 语言切换
│   ├── globals.css             # 全局样式与打印适配
│   └── api/
│       ├── plan/               # 服务端中转：规划演示文稿大纲（流式）
│       └── gen/                # 服务端中转：生成单页图片
├── components/
│   ├── ApiKeyModal.tsx         # API 配置弹窗，支持协议/模式选择
│   ├── InputStep.tsx           # 文本输入与 PDF/DOCX 解析上传
│   ├── ConfigStep.tsx          # 页数/语言/风格/附加提示配置，触发规划生成
│   ├── PlanningReviewStep.tsx  # 大纲审阅、增删改、批量生成图片
│   ├── LoadingStep.tsx         # 规划/生成进度展示
│   ├── EditorStep.tsx          # 逐页预览/重绘、编辑文本、打印导出
│   └── ProgressBar.tsx         # 进度条组件
├── lib/
│   ├── api.ts                  # 封装规划与图片生成，支持直连/中转模式
│   ├── prompts.ts              # 规划与图片生成的 Prompt 构建
│   ├── config.ts               # API 配置的存取与校验
│   ├── translations.ts         # 中英文文案
│   ├── types.ts                # 类型定义
│   └── utils.ts                # 工具函数（JSON 清理等）
├── package.json                # 依赖与脚本（包含 Cloudflare 部署脚本）
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind CSS 配置
├── tsconfig.json               # TypeScript 配置
└── wrangler.toml               # Cloudflare Workers 配置
```

## 常见问题

- **看不到弹窗/配置未保存？** 配置存储在浏览器 localStorage，清理缓存后需重新填写。
- **DOCX 未能解析？** 等待 mammoth 脚本加载后重试；或将文档导出为 TXT/MD 再上传。
- **PDF 太大？** 目前限制 20MB，超出请精简或分段上传。
- **图片生成失败？** 检查模型/配额；在大纲审阅或编辑器中可对单页重新生成。

## 许可证

请按仓库 LICENSE（若未提供，则默认保留所有权利）。
