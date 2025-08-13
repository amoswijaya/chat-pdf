import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userChat = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        chats: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const chats = userChat?.chats || [];
    return NextResponse.json(chats, { status: 200 });
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};
