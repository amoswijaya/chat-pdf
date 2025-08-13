"use client";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Chat } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GripVertical } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const ChatBar = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error("Failed to fetch chats");
      return res.json();
    },
  });

  const { id } = useParams();
  return (
    <>
      <ResizablePanel defaultSize={15} minSize={15}>
        <div className="h-full flex flex-col items-center bg-[#0b0f19] text-neutral-100 border-r border-neutral-800 p-3">
          <div className="w-full sticky top-0 z-10 bg-[#0b0f19] pb-3">
            <Link href={"/dashboard"}>
              <Button
                className="
            w-full gap-2 rounded-lg
            border border-neutral-800
            bg-neutral-900 hover:bg-neutral-800
            text-neutral-100
            transition-colors
          "
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Upload PDF</span>
              </Button>
            </Link>
          </div>

          <div className="flex flex-col w-full h-full overflow-y-auto pb-2 space-y-2">
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="w-full h-9 rounded-lg bg-neutral-800"
                  />
                ))
              : data?.map((chat: Chat) => (
                  <Link
                    key={chat.id}
                    href={`/dashboard/chat/${chat.id}`}
                    className="w-full"
                  >
                    <Button
                      className={cn(
                        `
                  relative w-full truncate justify-start px-4 py-2 rounded-lg
                  border border-neutral-800
                  bg-neutral-900 hover:bg-neutral-800
                  text-neutral-300 hover:text-neutral-100
                  transition-colors
                `,
                        {
                          "bg-[#1e1f24] border-[#2a2b31] text-neutral-100 before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1.5 before:rounded-full before:bg-blue-500":
                            chat.id === id,
                        }
                      )}
                    >
                      <span className="truncate">{chat.fileName}</span>
                    </Button>
                  </Link>
                ))}
          </div>
        </div>
      </ResizablePanel>

      <div className="relative flex items-center">
        <ResizableHandle className="w-1 h-full bg-neutral-800" />
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="rounded-sm p-1 bg-neutral-800">
            <GripVertical className="text-neutral-500 w-3 h-3" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatBar;
