/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { supabase } from "./supabase";
import { generateEmbeddings } from "./gemini";

export const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(process.env.PINECONE_INDEX_NAME!);

// 1 user = 1 namespace
export const makeNamespace = (clerkId: string) =>
  (clerkId.startsWith("user_") ? clerkId : `user_${clerkId}`).replace(
    /[^\w-]/g,
    "_"
  );

type Meta = {
  source: string; // filePath (path di bucket)
  filePath: string; // sama dgn source, dipisah biar query gampang
  folderUrl: string;
  page: number;
  text: string;
  chunk: number;
};

const pad6 = (n: number) => String(n).padStart(6, "0");

export async function upsertDocumentToPinecone(opts: {
  filePath: string;
  clerkId: string;
}) {
  const { filePath, clerkId } = opts;
  const nsName = makeNamespace(clerkId);
  const ns = index.namespace(nsName);

  // 1) Ambil PDF dari Supabase
  const { data: blob, error } = await supabase.storage
    .from("documents")
    .download(filePath);
  if (error) throw error;

  const loader = new PDFLoader(blob, { splitPages: true });
  const pages = await loader.load();

  // 2) Split text per halaman → chunk
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const rawDocs = await splitter.splitDocuments(pages);

  // 3) SINKRONISASI: filter doc+text secara bersamaan (hindari index meleset)
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
    return { namespace: nsName, count: 0, reason: "no text" as const };
  }

  // 4) Idempotent: hapus chunk lama dari file yg sama
  await deleteByPrefix(ns, `${filePath}#`);

  // 5) Embedding
  const texts = docs.map((d) => d.text);
  const embeddings = await generateEmbeddings(texts); // number[][]
  if (embeddings.length !== texts.length) {
    throw new Error(
      `[UPSERT] embeddings mismatch: got ${embeddings.length}, expected ${texts.length}`
    );
  }

  // 6) Build vectors (ID: `${filePath}#000000`)
  const folderUrl = filePath.replace(/\/[^/]*$/, "") || "/";
  const vectors: PineconeRecord<Meta>[] = docs.map((d, i) => ({
    id: `${filePath}#${pad6(i)}`,
    values: embeddings[i],
    metadata: {
      source: filePath,
      filePath,
      folderUrl,
      page: d.page,
      text: d.text,
      chunk: i,
    },
  }));

  // 7) Upsert batched
  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    await ns.upsert(vectors.slice(i, i + BATCH));
  }

  console.log(
    `[UPSERT] ns=${nsName} file=${filePath} vectors=${vectors.length} sampleId=${vectors[0].id}`
  );
  return { namespace: nsName, count: vectors.length };
}

async function deleteByPrefix(
  ns: ReturnType<typeof index.namespace>,
  prefix: string
) {
  let next: string | undefined;
  let total = 0;
  do {
    const page = await ns.listPaginated({
      prefix,
      limit: 100,
      paginationToken: next,
    });
    const ids = (page.vectors ?? []).map((v) => v.id);
    if (ids.length) {
      await ns.deleteMany(ids);
      total += ids.length;
    }
    next = page.pagination?.next;
  } while (next);
  if (total) console.log(`[UPSERT] cleaned old chunks: ${total}`);
}

export async function deleteDocumentByPrefix(opts: {
  namespace: string;
  filePath: string;
}) {
  const ns = index.namespace(opts.namespace);
  const prefix = `${opts.filePath}#`;
  let next: string | undefined;
  let total = 0;
  do {
    const page = await ns.listPaginated({
      prefix,
      limit: 100,
      paginationToken: next,
    });
    const ids = (page.vectors ?? []).map((v) => v.id);
    if (ids.length) {
      await ns.deleteMany(ids);
      total += ids.length;
    }
    next = page.pagination?.next;
  } while (next);
  return { deleted: total };
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
