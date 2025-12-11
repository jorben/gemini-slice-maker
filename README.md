<div align="center">
   <img src="https://github.com/jorben/pptmaker/blob/main/public/pptmaker.png" alt="PPTMaker" />
</div>

# PPTMaker

[English](README.md) | [简体中文](README_zh.md)

An AI-powered presentation generator that supports uploading/pasting text or PDF/Word/Markdown/TXT files, automatically plans outlines, generates visual drafts, and provides visual editing with one-click PDF export. Supports both Google VertexAI-compatible and OpenAI-compatible APIs, with two request modes (client direct / server proxy) available. Configuration is saved in browser localStorage.

## Features

- **Multilingual UI**: Bilingual Chinese-English switching, interface language persisted to localStorage.
- **Multi-source Input**: Supports pasting text, uploading PDF (Base64 direct transfer) and DOCX (built-in mammoth parsing), or other text files.
- **Configurable Generation**: Customize page count (or auto-detect), output language, visual style (minimal/detailed/custom), additional prompts, and specify content model and image model separately.
- **Dual Protocol/Dual Mode**: VertexAI-compatible or OpenAI-compatible; choose between browser direct connection or Next.js API route proxy.
- **Streaming Planning & Progress Indicators**: Outline planning with streaming response, progress bar showing stage-by-stage progress.
- **Generation & Editing**: Page-by-page image generation, manually adjust titles/bullet points/visual descriptions, support single-page regeneration.
- **Print & Export**: Supports print view, export PDF via browser print dialog.

## Quick Start

### Requirements

- Node.js 18+
- npm 9+ (project uses npm scripts)

### Install Dependencies

```bash
npm install
```

### Local Development

```bash
npm run dev
```

Visit: http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

### Cloudflare Deployment (Optional)

Built-in OpenNext + Wrangler scripts:

- Preview: `npm run cf-dev`
- Build: `npm run cf-build`
- Deploy: `npm run cf-deploy`

## API Configuration (Required on First Use)

After startup, an API configuration modal will appear. Configuration is stored in browser localStorage:

1. Choose protocol: VertexAI-compatible / OpenAI-compatible.
2. Choose request mode:
   - Client Direct: Frontend directly requests your configured API Base.
   - Server Proxy: Proxy through Next.js API routes `/api/plan` and `/api/gen`.
3. Fill in API Key, API Base, content model ID, and image model ID.
4. Click Continue to save.

Default model suggestions (examples only, replace with your actual service):

- Content model: `gemini-2.5-flash` (or OpenAI-compatible models like `gpt-4.1`, etc.)
- Image model: `gemini-2.5-flash-image` (or OpenAI-compatible image models)

## Usage Flow

1. **Input Material**: Paste text or upload files (PDF/DOCX/MD/TXT).
2. **Style & Parameters**: Choose visual style, page count (or auto), output language, additional requirements.
3. **Generate Outline**: Enter planning phase, displaying streaming results in real-time.
4. **Review Outline**: Add/delete pages, modify titles/bullet points/visual descriptions.
5. **Generate Images**: Page-by-page visual draft generation, real-time progress updates, retry failed pages.
6. **Edit & Export**: Adjust content in editor, support print view and export PDF via browser.

## Directory Structure (Core)

```
├── app/
│   ├── layout.tsx              # Root layout, loads mammoth script
│   ├── page.tsx                # Main flow: multi-step state management & UI language switching
│   ├── globals.css             # Global styles & print adaptation
│   └── api/
│       ├── plan/               # Server proxy: plan presentation outline (streaming)
│       └── gen/                # Server proxy: generate single page image
├── components/
│   ├── ApiKeyModal.tsx         # API config modal, supports protocol/mode selection
│   ├── InputStep.tsx           # Text input & PDF/DOCX parsing upload
│   ├── ConfigStep.tsx          # Page count/language/style/additional prompts config, triggers planning
│   ├── PlanningReviewStep.tsx  # Outline review, add/delete/modify, batch generate images
│   ├── LoadingStep.tsx         # Planning/generation progress display
│   ├── EditorStep.tsx          # Page-by-page preview/regenerate, edit text, print export
│   └── ProgressBar.tsx         # Progress bar component
├── lib/
│   ├── api.ts                  # Encapsulates planning & image generation, supports direct/proxy modes
│   ├── prompts.ts              # Prompt construction for planning & image generation
│   ├── config.ts               # API config storage & validation
│   ├── translations.ts         # Chinese-English copy
│   ├── types.ts                # Type definitions
│   └── utils.ts                # Utility functions (JSON cleanup, etc.)
├── package.json                # Dependencies & scripts (includes Cloudflare deployment scripts)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── wrangler.toml               # Cloudflare Workers configuration
```

## FAQ

- **Can't see modal/config not saved?** Configuration is stored in browser localStorage, needs refilling after cache cleanup.
- **DOCX not parsing?** Wait for mammoth script to load and retry; or export document as TXT/MD and upload.
- **PDF too large?** Currently limited to 20MB, please simplify or upload in segments if exceeded.
- **Image generation failed?** Check model/quota; single pages can be regenerated in outline review or editor.

## License

Please refer to the repository LICENSE (if not provided, all rights reserved by default).
