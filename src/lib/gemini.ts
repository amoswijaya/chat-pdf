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

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return embeddings.embedDocuments(texts.map(clean));
}
export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddings.embedQuery(clean(text));
}

const GEMINI_PRIMARY = "gemini-1.5-flash";
const GEMINI_SECONDARY = "gemini-1.5-flash-8b";

const geminiPrimary = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: GEMINI_PRIMARY,
  temperature: 0.2,
  maxOutputTokens: 2048,
});

const geminiSecondary = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: GEMINI_SECONDARY,
  temperature: 0.2,
  maxOutputTokens: 2048,
});

const deepseek = new ChatOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  configuration: { baseURL: "https://api.deepseek.com" },
  model: "deepseek-reasoner", // atau "deepseek-reasoner"
  temperature: 0.2,
});

function isQuotaOrOverload(e: any) {
  const msg = String(e?.message ?? e ?? "");
  return /429|quota|Too Many Requests|503|overload/i.test(msg);
}

export const llm = {
  async invoke(messages: BaseMessage[]) {
    try {
      return await deepseek.invoke(messages);
    } catch (e1) {
      if (!isQuotaOrOverload(e1)) throw e1;
      try {
        return await geminiSecondary.invoke(messages);
      } catch (e2) {
        if (!isQuotaOrOverload(e2) || !deepseek) throw e2;
        return await geminiPrimary.invoke(messages);
      }
    }
  },
};
