/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "text-embedding-004",
});
const clean = (t: string) => t.replace(/\s+/g, " ").trim();
export async function generateEmbeddings(texts: string[]) {
  return embeddings.embedDocuments(texts.map(clean));
}
export async function generateEmbedding(text: string) {
  return embeddings.embedQuery(clean(text));
}

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 8000);
const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS ?? 512);

const dsChat = new ChatOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  configuration: { baseURL: "https://api.deepseek.com" },
  model: "deepseek-chat",
  temperature: 0.2,
  maxRetries: 0,
});

const gemini8b = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-1.5-flash-8b",
  temperature: 0.2,
  maxOutputTokens: MAX_TOKENS,
  maxRetries: 0,
});
const geminiFlash = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-1.5-flash",
  temperature: 0.2,
  maxOutputTokens: MAX_TOKENS,
  maxRetries: 0,
});

function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error(`Timeout ${ms}ms`)), ms);
  return fn(ctrl.signal).finally(() => clearTimeout(t));
}

function toStr(c: any): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c))
    return c.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("\n");
  return (c?.text ?? String(c ?? "")).trim();
}

export const llm = {
  async invoke(messages: BaseMessage[]) {
    const a = withTimeout(TIMEOUT_MS, (signal) =>
      dsChat.invoke(messages, { signal })
    );
    const b = withTimeout(TIMEOUT_MS, (signal) =>
      gemini8b.invoke(messages, { signal })
    );

    try {
      const winner = await Promise.any([a, b]);
      return winner;
    } catch {
      return await withTimeout(TIMEOUT_MS, (signal) =>
        geminiFlash.invoke(messages, { signal })
      );
    }
  },

  async invokeText(messages: BaseMessage[]) {
    const r = await this.invoke(messages);
    return toStr((r as any)?.content);
  },
};
