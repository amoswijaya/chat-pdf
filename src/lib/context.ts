/* eslint-disable @typescript-eslint/no-explicit-any */
import { pc } from "./pincone";
import { generateEmbedding } from "./gemini";

const index = pc.index(process.env.PINECONE_INDEX_NAME!);

type Match = {
  id?: string;
  score?: number;
  metadata?: Record<string, any>;
};

type GetContextOpts = {
  namespace: string;
  topK?: number;
  scoreThreshold?: number;
  maxChunks?: number;
  debug?: boolean;
};

export async function getContext(
  query: string,
  {
    namespace,
    topK = 8,
    scoreThreshold = 0.28,
    maxChunks = 6,
    debug = false,
  }: GetContextOpts
): Promise<string[]> {
  const vector = await generateEmbedding(query);

  const res = await index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
    includeValues: false,
  });

  const matches: Match[] = res.matches ?? [];

  if (debug) {
    const top = matches[0];
    console.log("[RAG] ns =", namespace);
    console.log("[RAG] top =", {
      id: top?.id,
      score: top?.score,
      file:
        (top?.metadata as any)?.filePath ||
        (top?.metadata as any)?.source ||
        "(unknown)",
    });
  }

  let docs =
    matches
      .filter((m) => (m.score ?? 0) >= scoreThreshold)
      .map((m) => (m.metadata as any)?.text as string)
      .filter(Boolean) ?? [];

  if (docs.length === 0 && matches.length) {
    docs = matches
      .slice(0, Math.min(3, matches.length))
      .map((m) => (m.metadata as any)?.text)
      .filter(Boolean) as string[];
    if (debug) console.warn("[RAG] fallback: using top 3 without threshold");
  }

  const seen = new Set<string>();
  const unique = [];
  for (const t of docs) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
      if (unique.length >= maxChunks) break;
    }
  }

  return unique;
}

export async function getTopMatches(
  query: string,
  {
    namespace,
    topK = 8,
  }: {
    namespace: string;
    topK?: number;
  }
): Promise<
  Array<{ id?: string; score?: number; page?: number; text?: string }>
> {
  const vector = await generateEmbedding(query);
  const res = await index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
    includeValues: false,
  });

  return (res.matches ?? []).map((m) => ({
    id: m.id,
    score: m.score,
    page:
      (m.metadata as any)?.page ??
      (m.metadata as any)?.loc?.pageNumber ??
      undefined,
    text: (m.metadata as any)?.text,
  }));
}
