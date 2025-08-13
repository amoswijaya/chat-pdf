import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    const message = await prisma.message.findMany({
      where: { chatId: id },
    });

    if (!message) {
      return NextResponse.json("Message not found", { status: 404 });
    }

    return NextResponse.json(message, {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching message:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
