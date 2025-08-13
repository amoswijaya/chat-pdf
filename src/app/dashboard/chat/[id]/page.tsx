"use client";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { Chat } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, LoaderCircle, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import MessageContainer from "../_commponents/ChatContainer";
const DetailChat = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["chat", id],
    queryFn: async (): Promise<Chat> => {
      const res = await fetch(`/api/chat/${id}`);
      if (!res.ok) throw new Error("Failed to fetch chat details");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chat/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete chat");
      return await res.json();
    },
    onSuccess: () => {
      toast.success("Chat deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      router.push("/dashboard");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  if (isError) {
    return <div>Error loading chat details</div>;
  }
  return (
    <>
      <ResizablePanel defaultSize={50} minSize={30}>
        {isLoading ? (
          <div className="p-4">
            <p>Loading chat details...</p>
          </div>
        ) : (
          <div className="h-full">
            <div className="flex justify-between px-4 py-2 gap-4 items-center">
              <p className="font-semibold">{data?.fileName}</p>
              <Button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                variant={"destructive"}
              >
                {mutation.isPending ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash />
                )}
              </Button>
            </div>
            <iframe
              src={`${data?.fileUrl}#view=FitH&pagemode=thumbs&zoom=page-width`}
              className="w-full h-full"
            />
          </div>
        )}
      </ResizablePanel>
      <div className="relative flex items-center">
        <ResizableHandle className="bg-neutral-100 w-1 h-full" />
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="bg-neutral-100 p-1 rounded">
            <GripVertical className="text-neutral-500 w-3 h-3" />
          </div>
        </div>
      </div>
      <ResizablePanel defaultSize={30} minSize={20}>
        <MessageContainer
          fileName={data?.fileName as string}
          fileUrl={data?.fileUrl as string}
          chatId={id as string}
          filePath={data?.filePath as string}
        />
      </ResizablePanel>
    </>
  );
};

export default DetailChat;
