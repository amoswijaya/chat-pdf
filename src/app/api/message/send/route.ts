import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { content, chatId, role } = body;
    const { userId } = await auth();

    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId as string,
      },
    });

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        chatId,
        role,
        userId: user?.id as string,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error in POST request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
