import { NextRequest, NextResponse } from 'next/server';
import type { PresentationConfig } from '@/lib/types';
import { SlideStyle } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * 获取 API Key
 */
function getApiKey(request: NextRequest): string {
  const headerKey = request.headers.get('x-api-key');
  const apiKey = headerKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('API key not configured. Please add GEMINI_API_KEY to .env.local');
  }
  
  return apiKey;
}

/**
 * 使用原生 fetch 调用 Gemini API
 * 完全控制请求，不传递任何客户端信息
 */
async function callGeminiAPI(
  apiKey: string,
  model: string,
  requestBody: Record<string, unknown>
): Promise<unknown> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 只设置必要的 headers，不传递任何客户端相关信息
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  return response.json();
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
}

/**
 * 从 Gemini 响应中提取文本
 */
function extractText(response: GeminiResponse): string {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text in response');
  }
  return text;
}

/**
 * 从 Gemini 响应中提取图片
 */
function extractImage(response: GeminiResponse): string | null {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = getApiKey(request);
    const body = await request.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing action or payload' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'plan-presentation':
        return await handlePlanPresentation(apiKey, payload);
      
      case 'generate-image':
        return await handleGenerateImage(apiKey, payload);
      
      case 'optimize-content':
        return await handleOptimizeContent(apiKey, payload);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

interface PlanPayload {
  document?: string;
  prompt?: string;
  model?: string;
}

async function handlePlanPresentation(apiKey: string, payload: PlanPayload) {
  const { document, prompt, model = 'gemini-2.5-flash' } = payload;

  if (!document && !prompt) {
    return NextResponse.json(
      { success: false, error: 'Missing document or prompt' },
      { status: 400 }
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: 'Missing prompt' },
      { status: 400 }
    );
  }

  const config: PresentationConfig = JSON.parse(prompt);

  const stylePrompt =
    config.style === SlideStyle.CUSTOM
      ? `Custom Style: ${config.customStyleDescription}`
      : `Style: ${
          config.style === SlideStyle.MINIMAL
            ? 'Minimalist, high impact, few words'
            : 'Detailed, educational, comprehensive'
        }`;

  const additionalContext = config.additionalPrompt
    ? `\nImportant Additional Instructions from User: ${config.additionalPrompt}`
    : '';

  const systemInstruction = `
    You are an expert presentation designer. 
    Analyze the provided input (text or document) and split it into a ${config.pageCount}-page presentation.
    Output Language: ${config.language}.
    ${stylePrompt}
    ${additionalContext}

    Return a JSON object with a 'title' for the whole deck and an array of 'slides'.
    For each slide, provide:
    1. 'title': The slide headline.
    2. 'bulletPoints': 3-5 key points (text only).
    3. 'visualDescription': A highly detailed, artistic description of how the slide should look visually.
  `;

  // 构建符合 Gemini REST API 格式的请求体
  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Input Text:\n${(document || '').substring(0, 30000)}` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          slides: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                bulletPoints: { type: 'ARRAY', items: { type: 'STRING' } },
                visualDescription: { type: 'STRING' },
              },
              required: ['title', 'bulletPoints', 'visualDescription'],
            },
          },
        },
        required: ['title', 'slides'],
      },
    },
  };

  try {
    const response = await callGeminiAPI(apiKey, model, requestBody);
    const text = extractText(response as GeminiResponse);

    return NextResponse.json({
      success: true,
      data: { content: text },
    });
  } catch (error) {
    throw error;
  }
}

interface ImagePayload {
  prompt?: string;
  model?: string;
}

async function handleGenerateImage(apiKey: string, payload: ImagePayload) {
  const { prompt, model = 'gemini-2.0-flash-exp' } = payload;

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: 'Missing prompt' },
      { status: 400 }
    );
  }

  const data = JSON.parse(prompt);
  const { slide, deckTitle, config } = data;

  const styleContext =
    config.style === SlideStyle.CUSTOM
      ? config.customStyleDescription
      : config.style === SlideStyle.MINIMAL
      ? 'Modern, clean, lots of whitespace, corporate memphis or swiss style'
      : 'Professional, structured, grid layout, academic or technical style';

  const additionalContext = config.additionalPrompt
    ? `\nAdditional Style Requirements: ${config.additionalPrompt}`
    : '';

  const fullPrompt = `
    Design a professional presentation slide.
    
    Context:
    Presentation Title: ${deckTitle}
    Slide Title: ${slide.title}
    Style Guide: ${styleContext}
    ${additionalContext}
    
    Visual Instructions:
    ${slide.visualDescription}
    
    Important:
    - Create a high-quality slide design.
    - Ensure the layout has clear space for text overlay.
    - Aspect Ratio 16:9.
  `;

  // 使用 Imagen 3 模型生成图片
  const imagenModel = 'imagen-3.0-generate-002';
  const imagenUrl = `${GEMINI_API_BASE}/models/${imagenModel}:predict?key=${apiKey}`;

  try {
    const response = await fetch(imagenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: fullPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
        },
      }),
    });

    if (!response.ok) {
      // 如果 Imagen 失败，回退到 Gemini 2.0 Flash 的图片生成
      const geminiRequestBody = {
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      };

      const geminiResponse = await callGeminiAPI(apiKey, model, geminiRequestBody);
      const imageData = extractImage(geminiResponse as GeminiResponse);

      if (imageData) {
        return NextResponse.json({
          success: true,
          data: { content: imageData },
        });
      }

      throw new Error('No image generated');
    }

    const result = await response.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
    const imageBase64 = result.predictions?.[0]?.bytesBase64Encoded;

    if (imageBase64) {
      return NextResponse.json({
        success: true,
        data: { content: `data:image/png;base64,${imageBase64}` },
      });
    }

    throw new Error('No image generated');
  } catch (error) {
    throw error;
  }
}

interface OptimizePayload {
  prompt?: string;
  model?: string;
}

async function handleOptimizeContent(apiKey: string, payload: OptimizePayload) {
  const { prompt, model = 'gemini-2.5-flash' } = payload;

  if (!prompt) {
    return NextResponse.json(
      { success: false, error: 'Missing prompt' },
      { status: 400 }
    );
  }

  const fullPrompt = `优化以下演示文稿内容，使其更加清晰、专业和吸引人：\n\n${prompt}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: fullPrompt }],
      },
    ],
  };

  try {
    const response = await callGeminiAPI(apiKey, model, requestBody);
    const text = extractText(response as GeminiResponse);

    return NextResponse.json({
      success: true,
      data: { content: text },
    });
  } catch (error) {
    throw error;
  }
}