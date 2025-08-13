import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { upsertDocumentToPinecone } from "@/lib/pincone";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File not provided" }, { status: 400 });
    }

    const mimeType = file.type;
    const size = file.size;
    if (mimeType !== "application/pdf")
      return NextResponse.json({ error: "Only PDF allowed" }, { status: 400 });
    if (size > 20 * 1024 * 1024)
      return NextResponse.json({ error: "Max size 20MB" }, { status: 413 });

    const bucket = "documents";
    const safeName = file.name.replace(/\s+/g, "_");
    const timestamp = Date.now();
    const filePath = `${clerkId}/${timestamp}-${safeName}`;

    const { data: up, error: upErr } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { contentType: mimeType, upsert: false });
    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(up.path);

    const { namespace } = await upsertDocumentToPinecone({
      filePath: up.path,
      clerkId,
    });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const chat = await prisma.chat.create({
      data: {
        fileName: safeName,
        filePath: up.path,
        pineconeNamespace: namespace,
        fileSize: Number(size),
        mimeType,
        fileUrl: pub.publicUrl,
        userId: user.id,
      },
    });

    return NextResponse.json(
      { path: up.path, url: pub.publicUrl, chat },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
