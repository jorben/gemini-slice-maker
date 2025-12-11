// OpenAI Compatible API - 前端直接调用

import { VertexApiConfig } from "./api";
import { PresentationConfig, SlideContent } from "./types";
import {
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
  getPlanningOutputFormatHint,
  buildImageGenerationPrompt,
} from "./prompts";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

/**
 * 调用 OpenAI Compatible API (Chat Completions)
 */
async function callOpenAIChatAPI(
  config: VertexApiConfig,
  model: string,
  messages: OpenAIMessage[],
  responseFormat?: { type: string },
  timeoutMs: number = 180000
): Promise<OpenAIResponse> {
  const url = `${config.apiBase}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
    };

    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 调用 OpenAI Compatible API (Images)
 */
async function callOpenAIImageAPI(
  config: VertexApiConfig,
  model: string,
  prompt: string,
  timeoutMs: number = 180000
): Promise<OpenAIResponse> {
  const url = `${config.apiBase}/images/generations`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1792x1024",
        response_format: "b64_json",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        response.statusText;
      throw new Error(`API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 从响应中提取文本
 */
function extractText(response: OpenAIResponse): string {
  const text = response.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text in response");
  }
  return text;
}

/**
 * 规划演示文稿结构 (OpenAI)
 */
export async function planPresentationOpenAI(
  config: VertexApiConfig,
  document: string,
  presentationConfig: PresentationConfig
): Promise<{ title: string; slides: SlideContent[] }> {
  const systemPrompt = buildPlanningSystemPrompt(presentationConfig) + getPlanningOutputFormatHint();

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildPlanningUserPrompt(document) },
  ];

  const response = await callOpenAIChatAPI(
    config,
    config.contentModelId,
    messages,
    { type: "json_object" }
  );
  const text = extractText(response);
  return JSON.parse(text);
}

/**
 * 生成幻灯片图片 (OpenAI)
 */
export async function generateSlideImageOpenAI(
  config: VertexApiConfig,
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig
): Promise<string> {
  const fullPrompt = buildImageGenerationPrompt(slide, deckTitle, presentationConfig);

  const response = await callOpenAIImageAPI(
    config,
    config.imageModelId,
    fullPrompt
  );

  const imageData = response.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error("No image generated");
  }

  return `data:image/png;base64,${imageData}`;
}
