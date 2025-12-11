import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

// 初始化 Google Generative AI SDK
export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 默认使用 Gemini 2.0 Flash
export const DEFAULT_MODEL = 'gemini-2.0-flash-exp';

// 流式生成内容
export async function* streamGenerateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
) {
  const response = await genAI.models.generateContentStream({
    model: modelName,
    contents: { parts: [{ text: prompt }] }
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

// 非流式生成内容
export async function generateContent(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  const response = await genAI.models.generateContent({
    model: modelName,
    contents: { parts: [{ text: prompt }] }
  });
  return response.text || '';
}
