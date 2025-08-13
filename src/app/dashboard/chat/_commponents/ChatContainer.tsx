/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import * as React from "react";
import MessageList from "./MessageList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageRole } from "@prisma/client";
import { toast } from "sonner";
type Props = {
  fileName: string;
  chatId: string;
  fileUrl?: string;
  filePath?: string;
};
const ChatContainer = ({ fileName, chatId, filePath, fileUrl }: Props) => {
  const [message, setMessage] = React.useState<string>("");
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: async (): Promise<any[]> => {
      const res = await fetch(`/api/message/${chatId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!message) return;
      const res = await fetch("/api/message/send", {
        method: "POST",
        body: JSON.stringify({
          content: message,
          chatId,
          role: MessageRole.USER,
        }),
      });
      setMessage("");
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },

    onMutate: async ({
      content,
      chatId,
      role,
    }: {
      content: string;
      chatId: string;
      role: MessageRole;
    }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });
      const previouseMessage = queryClient.getQueryData(["messages", chatId]);

      queryClient.setQueryData(["messages", chatId], (old: any) => {
        const optimisticMessage = {
          id: "optimistic" + Date.now(),
          content,
          role,
          chatId,
          userId: "",
        };

        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });

      return previouseMessage;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      const res = await fetch("/api/message/response", {
        method: "POST",
        body: JSON.stringify({
          message: data.content,
          filePath: filePath,
          fileUrl: fileUrl,
          FolderName: fileName,
          chatId,
          userId: data.userId,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },

    onError: () => {
      toast.error("Failed to send message");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate({
      content: message,
      chatId,
      role: MessageRole.USER,
    });
  };

  console.log("Messages:", messages);

  if (error) return <div>Error loading messages</div>;
  return (
    <div className="flex flex-col h-full bg-[#0b0f19] text-neutral-100">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800">
        <h2 className="font-semibold text-lg">Chat</h2>
      </div>

      {/* Messages (komponenmu yang sudah di-dark-kan sebelumnya) */}
      <MessageList
        messages={messages || []}
        isSending={mutation.isPending}
        isLoading={isLoading}
      />

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 flex items-center gap-2 border-t border-neutral-800"
      >
        <Input
          disabled={mutation.isPending}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tulis pesan…"
          className="
        bg-neutral-900 border-neutral-800 text-neutral-100
        placeholder:text-neutral-500
        focus-visible:ring-neutral-700 focus-visible:ring-2
        focus-visible:border-neutral-700
        disabled:opacity-50
      "
        />
        <Button
          disabled={mutation.isPending}
          type="submit"
          className="
        inline-flex items-center gap-2
        bg-gray-800 hover:bg-gray-700
        text-white
        disabled:opacity-60
      "
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatContainer;
