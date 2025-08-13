/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MessageRole } from "@prisma/client";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getContext } from "@/lib/context";
import { llm } from "@/lib/gemini";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

function toText(c: any): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("\n");
  }
  return (c?.text ?? String(c ?? "")).trim();
}

function isAmbiguous(q: string) {
  const s = (q ?? "").trim().toLowerCase();

  if (s.length < 6) return true;

  if (/^[\p{P}\p{Zs}]+$/u.test(s)) return true;

  const patterns = [
    /^(ya|iya|nggak|ga?k|tidak|ngga|gk|oke|ok)$/i,
    /^masa( sih)?!?$/i,
    /^(serius|hah+|kok|loh|lah)$/i,
    /^(what|h(m|mm|mmm)+)$/i,
    /^[!?…]+$/u,
    /\?{2,}$/,
  ];

  return patterns.some((rx) => rx.test(s));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { userId: namespace } = await auth();

    const {
      message,
      chatId,
      userId,
      filePath,
      topK = 8,
      scoreThreshold = 0.28,
      debug = true,
    }: {
      message: string;
      chatId: string;
      userId: string;
      filePath: string;
      topK?: number;
      scoreThreshold?: number;
      debug?: boolean;
    } = body ?? {};

    if (!message || !chatId || !userId || !filePath) {
      return NextResponse.json(
        {
          error: "Missing required fields (message, chatId, userId, filePath)",
        },
        { status: 400 }
      );
    }

    const contextChunks = await getContext(message, {
      namespace: namespace as string,
      filePath,
      topK,
      scoreThreshold,
      debug,
    });

    console.log("contextChunks:", contextChunks);

    const ctxText = (contextChunks ?? []).join("\n---\n").slice(0, 10_000);
    const ambiguous = isAmbiguous(message);
    const system = new SystemMessage(
      ambiguous
        ? "You are a helpful assistant. If the user's message is ambiguous, ask ONE specific clarifying question related to the CONTEXT. Use the user's language."
        : "You are a helpful assistant. Use ONLY the provided context to answer. If a detail doesn't exist in the context, say 'tidak disebutkan', but still answer from context. Be concise."
    );

    const human = new HumanMessage(
      [
        "CONTEXT:",
        ctxText || "(no relevant context)",
        "",
        "USER QUESTION:",
        message,
      ].join("\n")
    );

    const llmResp = await llm.invoke([system, human]);
    const content = toText(llmResp?.content);

    const saved = await prisma.message.create({
      data: {
        content,
        role: MessageRole.SYSTEM,
        chatId,
        userId,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        contextSize: contextChunks?.length ?? 0,
        message: saved,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/message/response:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        detail: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
