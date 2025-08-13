import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { deleteDocumentNamespace } from "@/lib/pincone";

export type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const chat = await prisma.chat.findUnique({ where: { id } });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    return NextResponse.json(chat, { status: 200 });
  } catch (err) {
    console.error("Error in GET route:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const { id } = await params;
    const chat = await prisma.chat.findUnique({ where: { id } });
    if (!chat)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (chat.pineconeNamespace && chat.filePath) {
      await deleteDocumentNamespace(chat.pineconeNamespace);
    }

    if (chat.filePath) {
      await supabase.storage.from("documents").remove([chat.filePath]);
    }

    await prisma.chat.delete({ where: { id: chat.id } });

    return NextResponse.json(
      { message: "Chat deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in DELETE route:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
