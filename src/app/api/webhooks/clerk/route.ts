import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const WEBHOOK_SECRET =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new NextResponse("Missing CLERK_WEBHOOK_SIGNING_SECRET", {
      status: 500,
    });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers) as WebhookEvent;

    switch (evt.type) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address ?? "";
        await prisma.user.upsert({
          where: { clerkId: id },
          update: {
            email,
            name: [first_name, last_name].filter(Boolean).join(" "),
          },
          create: {
            clerkId: id,
            email,
            name: [first_name, last_name].filter(Boolean).join(" "),
          },
        });
        break;
      }
      case "user.updated": {
        const { id, email_addresses, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address ?? undefined;
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email,
            name: [first_name, last_name].filter(Boolean).join(" "),
          },
        });
        break;
      }
      case "user.deleted": {
        const { id } = evt.data;
        await prisma.user
          .delete({ where: { clerkId: id as string } })
          .catch(() => {});
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("⛔ Clerk webhook verify/handle error:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }
}
