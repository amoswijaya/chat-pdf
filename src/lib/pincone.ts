/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { supabase } from "./supabase";
import { generateEmbeddings } from "./gemini";
import crypto from "crypto";

export const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(process.env.PINECONE_INDEX_NAME!);

export const makeFileNamespace = (filePath: string) => {
  const h = crypto
    .createHash("sha1")
    .update(filePath)
    .digest("hex")
    .slice(0, 12);
  return `doc_${h}`;
};

type Meta = {
  source: string;
  filePath: string;
  page: number;
  text: string;
  chunk: number;
};

const pad6 = (n: number) => String(n).padStart(6, "0");

async function safeDeleteAll(ns: ReturnType<typeof index.namespace>) {
  try {
    await ns.deleteAll();
  } catch (e: any) {
    if (e?.name !== "PineconeNotFoundError") throw e;
  }
}

export async function upsertDocumentToPinecone(opts: { filePath: string }) {
  const { filePath } = opts;
  const nsName = makeFileNamespace(filePath);
  const ns = index.namespace(nsName);

  const { data: blob, error } = await supabase.storage
    .from("documents")
    .download(filePath);
  if (error) throw error;

  const pages = await new PDFLoader(blob, { splitPages: true }).load();
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const rawDocs = await splitter.splitDocuments(pages);

  const docs = rawDocs
    .map((doc) => {
      const text = (doc.pageContent ?? "").trim();
      const meta = doc.metadata as any;
      const page =
        typeof meta?.page === "number"
          ? meta.page
          : typeof meta?.loc?.pageNumber === "number"
          ? meta.loc.pageNumber
          : 0;
      return { text, page };
    })
    .filter((d) => d.text.length > 0);

  if (docs.length === 0) {
    console.warn("[UPSERT] No extractable text:", { filePath, nsName });
    return { namespace: nsName, count: 0, reason: "no-text" as const };
  }

  await safeDeleteAll(ns);

  const texts = docs.map((d) => d.text);
  const embeddings = await generateEmbeddings(texts);
  if (embeddings.length !== texts.length) {
    throw new Error(
      `[UPSERT] embeddings mismatch: got ${embeddings.length}, expected ${texts.length}`
    );
  }

  const vectors: PineconeRecord<Meta>[] = docs.map((d, i) => ({
    id: pad6(i),
    values: embeddings[i],
    metadata: {
      source: filePath,
      filePath,
      page: d.page,
      text: d.text,
      chunk: i,
    },
  }));

  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    await ns.upsert(vectors.slice(i, i + BATCH));
  }

  console.log(
    `[UPSERT] ns=${nsName} file=${filePath} vectors=${vectors.length}`
  );
  return { namespace: nsName, count: vectors.length };
}
export async function deleteDocumentNamespace(namespace: string) {
  const ns = index.namespace(namespace);
  await safeDeleteAll(ns);
  return { deleted: true };
}

export async function debugPeek(nsName: string, prefix?: string) {
  const ns = index.namespace(nsName);
  const page = await ns.listPaginated({ prefix, limit: 3 });
  const ids = (page.vectors ?? []).map((v) => v.id);
  console.log("[peek]", nsName, "ids:", ids);
  if (!ids.length) return;
  const got = await ns.fetch(ids as string[]);
  for (const id of ids) {
    console.log("meta:", id, (got.records as any)?.[id as string]?.metadata);
  }
}
