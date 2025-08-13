/* eslint-disable @typescript-eslint/no-explicit-any */
import { pc } from "./pincone";
import { generateEmbedding } from "./gemini";

type GetFromEmbeddingsOpts = {
  namespace: string;
  filePath?: string;
  folderUrl?: string;
  topK?: number;
  debug?: boolean;
};

type GetContextOpts = GetFromEmbeddingsOpts & {
  scoreThreshold?: number;
  maxChunks?: number;
};

const index = pc.index(process.env.PINECONE_INDEX_NAME!);

function expandSlashVariants(s?: string) {
  if (!s) return undefined;
  const noTrail = s.replace(/\/+$/, "");
  const withTrail = noTrail + "/";
  return Array.from(new Set([s, noTrail, withTrail]));
}

function buildFilter({
  filePath,
  folderUrl,
}: {
  filePath?: string;
  folderUrl?: string;
}) {
  if (filePath) {
    return { filePath: { $eq: filePath } };
  }
  if (folderUrl) {
    const variants = expandSlashVariants(folderUrl);
    if (variants?.length) return { folderUrl: { $in: variants } };
  }
  return undefined;
}

export async function getFromEmbeddings(
  queryEmbedding: number[],
  { namespace, filePath, folderUrl, topK = 8, debug }: GetFromEmbeddingsOpts
) {
  const ns = index.namespace(namespace);
  const filter = buildFilter({ filePath, folderUrl });

  const res = await ns.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    includeValues: false,
    filter,
  });

  const matches = res.matches ?? [];
  if (debug) {
    console.log(`[query ${namespace}] k=${topK} hits=${matches.length}`);
    if (matches[0]) {
      console.log("top score:", matches[0].score);
      console.log("first meta keys:", Object.keys(matches[0].metadata ?? {}));
    }
  }
  return matches;
}

export async function getContext(
  query: string,
  opts: GetContextOpts
): Promise<string[]> {
  const {
    namespace,
    filePath,
    folderUrl,
    topK = 8,
    scoreThreshold = 0.28,
    maxChunks = 10,
    debug,
  } = opts;
  const queryEmbedding = await generateEmbedding(query);
  if (debug) console.log("embed dim:", queryEmbedding.length);

  let matches = await getFromEmbeddings(queryEmbedding, {
    namespace,
    filePath,
    folderUrl,
    topK,
    debug,
  });

  if ((matches?.length ?? 0) === 0 && (filePath || folderUrl) && debug) {
    console.warn(
      "[context] no matches with filter; retry without filter for diagnosis"
    );
    matches = await getFromEmbeddings(queryEmbedding, {
      namespace,
      topK,
      debug,
    });
  }

  let docs = (matches ?? [])
    .filter((m) => (m.score ?? 0) >= scoreThreshold)
    .map((m) => (m.metadata as any)?.text as string)
    .filter(Boolean);

  if (docs.length === 0 && (matches?.length ?? 0) > 0) {
    docs = matches
      .slice(0, Math.min(3, matches.length))
      .map((m) => (m.metadata as any)?.text as string)
      .filter(Boolean);
    if (debug)
      console.warn(`[context] fell back to top ${docs.length} w/o threshold`);
  }

  const uniq = Array.from(new Set(docs)).slice(0, maxChunks);

  if (debug) {
    console.log(
      `context chunks: ${uniq.length}/${docs.length} (max ${maxChunks})`
    );
  }
  return uniq;
}

export async function getContextByFile(
  query: string,
  opts: {
    namespace: string;
    filePath: string;
    topK?: number;
    scoreThreshold?: number;
    debug?: boolean;
  }
) {
  return getContext(query, { ...opts, folderUrl: undefined });
}

export async function getContextByFolder(
  query: string,
  opts: {
    namespace: string;
    folderUrl: string;
    topK?: number;
    scoreThreshold?: number;
    debug?: boolean;
  }
) {
  return getContext(query, { ...opts, filePath: undefined });
}
