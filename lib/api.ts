// API 调用 - 支持客户端直连和服务端中转两种模式

import { getApiConfig, ApiProtocol, RequestMode, ApiConfig } from "./config";
import { PresentationConfig, SlideContent } from "./types";
import { cleanJsonString } from "./utils";
import {
  buildPlanningSystemPrompt,
  buildPlanningUserPrompt,
  getPlanningResponseSchema,
  getPlanningOutputFormatHint,
  buildImageGenerationPrompt,
} from "./prompts";

// ============ 客户端直连 API 调用函数 ============

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

interface OpenAIImageInfo {
  image_url: {
    url: string;
  };
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      images?: OpenAIImageInfo[];
    };
  }>;
}

/**
 * 客户端直连 - 流式调用 VertexAI Compatible API
 */
async function clientStreamVertexAPI(
  config: ApiConfig,
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs: number = 180000
): Promise<Response> {
  const url = `${config.apiBase}/models/${model}:streamGenerateContent?alt=sse`;
  console.log("[clientStreamVertexAPI] 请求 URL:", url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error?.message || response.statusText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`API error: ${errorMessage}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

/**
 * 客户端直连 - 流式调用 OpenAI Compatible API
 */
async function clientStreamOpenAIAPI(
  config: ApiConfig,
  model: string,
  messages: Array<{ role: string; content: string }>,
  responseFormat?: { type: string },
  timeoutMs: number = 180000
): Promise<Response> {
  const url = `${config.apiBase}/chat/completions`;
  console.log("[clientStreamOpenAIAPI] 请求 URL:", url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      stream: true,
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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error?.message || response.statusText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      throw new Error(`API error: ${errorMessage}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

/**
 * 客户端直连 - 调用 VertexAI Compatible API（非流式）
 */
async function clientCallVertexAPI(
  config: ApiConfig,
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs: number = 180000
): Promise<GeminiResponse> {
  const url = `${config.apiBase}/models/${model}:generateContent`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": config.apiKey,
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
 * 客户端直连 - 调用 OpenAI Compatible API（图片生成）
 */
async function clientCallOpenAIImageAPI(
  config: ApiConfig,
  model: string,
  prompt: string,
  timeoutMs: number = 180000
): Promise<OpenAIResponse> {
  const url = `${config.apiBase}/chat/completions`;

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
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
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
 * 从 VertexAI 响应中提取图片
 */
function extractImage(response: GeminiResponse): string | null {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

// ============ 客户端直连模式实现 ============

/**
 * 客户端直连 - 规划演示文稿结构（流式）
 */
async function planPresentationClientDirect(
  document: string,
  presentationConfig: PresentationConfig,
  apiConfig: ApiConfig,
  onChunk?: (text: string) => void
): Promise<{ title: string; slides: SlideContent[] }> {
  let fullText = "";

  if (apiConfig.protocol === ApiProtocol.OPENAI) {
    const systemPrompt =
      buildPlanningSystemPrompt(presentationConfig) +
      getPlanningOutputFormatHint();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildPlanningUserPrompt(document) },
    ];

    const response = await clientStreamOpenAIAPI(
      apiConfig,
      apiConfig.contentModelId,
      messages,
      { type: "json_object" }
    );

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (onChunk) onChunk(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } else {
    // VertexAI 协议
    const systemInstruction = buildPlanningSystemPrompt(presentationConfig);

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildPlanningUserPrompt(document) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: getPlanningResponseSchema(),
      },
    };

    const response = await clientStreamVertexAPI(
      apiConfig,
      apiConfig.contentModelId,
      requestBody
    );

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullText += text;
              if (onChunk) onChunk(text);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  const cleanedText = cleanJsonString(fullText);
  return JSON.parse(cleanedText);
}

/**
 * 客户端直连 - 生成幻灯片图片
 */
async function generateSlideImageClientDirect(
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig,
  apiConfig: ApiConfig
): Promise<string> {
  const fullPrompt = buildImageGenerationPrompt(
    slide,
    deckTitle,
    presentationConfig
  );

  if (apiConfig.protocol === ApiProtocol.OPENAI) {
    const response = await clientCallOpenAIImageAPI(
      apiConfig,
      apiConfig.imageModelId,
      fullPrompt
    );

    const images = response.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      throw new Error("No image generated");
    }

    return images[0].image_url.url;
  } else {
    // VertexAI 协议
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    };

    const response = await clientCallVertexAPI(
      apiConfig,
      apiConfig.imageModelId,
      requestBody
    );

    const extracted = extractImage(response);
    if (!extracted) {
      throw new Error("No image generated");
    }

    return extracted;
  }
}

// ============ 服务端中转模式实现 ============

/**
 * 服务端中转 - 规划演示文稿结构（流式）
 */
async function planPresentationServerProxy(
  document: string,
  presentationConfig: PresentationConfig,
  apiConfig: ApiConfig,
  onChunk?: (text: string) => void
): Promise<{ title: string; slides: SlideContent[] }> {
  console.log("[planPresentationServerProxy] 开始请求 /api/plan");

  const response = await fetch("/api/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document,
      presentationConfig,
      apiConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: string })?.error || response.statusText;
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: { title: string; slides: SlideContent[] } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.chunk && onChunk) {
            onChunk(parsed.chunk);
          }

          if (parsed.done && parsed.result) {
            result = parsed.result;
          }
        } catch (e) {
          if (
            e instanceof Error &&
            e.message !== "Unexpected end of JSON input"
          ) {
            throw e;
          }
        }
      }
    }
  }

  if (!result) {
    throw new Error("No result received from stream");
  }

  return result;
}

/**
 * 服务端中转 - 生成幻灯片图片
 */
async function generateSlideImageServerProxy(
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig,
  apiConfig: ApiConfig
): Promise<string> {
  const response = await fetch("/api/gen", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slide,
      deckTitle,
      presentationConfig,
      apiConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      (errorData as { error?: string })?.error || response.statusText;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.imageData;
}

// ============ 统一导出的 API 函数 ============

/**
 * 规划演示文稿结构 - 根据配置选择客户端直连或服务端中转
 */
export async function planPresentation(
  document: string,
  presentationConfig: PresentationConfig,
  onChunk?: (text: string) => void
): Promise<{ title: string; slides: SlideContent[] }> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    throw new Error("API not configured");
  }

  console.log("[planPresentation] 请求模式:", apiConfig.requestMode);

  if (apiConfig.requestMode === RequestMode.CLIENT_DIRECT) {
    return planPresentationClientDirect(
      document,
      presentationConfig,
      apiConfig,
      onChunk
    );
  } else {
    return planPresentationServerProxy(
      document,
      presentationConfig,
      apiConfig,
      onChunk
    );
  }
}

/**
 * 生成幻灯片图片 - 根据配置选择客户端直连或服务端中转
 */
export async function generateSlideImage(
  slide: SlideContent,
  deckTitle: string,
  presentationConfig: PresentationConfig
): Promise<string> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    throw new Error("API not configured");
  }

  if (apiConfig.requestMode === RequestMode.CLIENT_DIRECT) {
    return generateSlideImageClientDirect(
      slide,
      deckTitle,
      presentationConfig,
      apiConfig
    );
  } else {
    return generateSlideImageServerProxy(
      slide,
      deckTitle,
      presentationConfig,
      apiConfig
    );
  }
}
