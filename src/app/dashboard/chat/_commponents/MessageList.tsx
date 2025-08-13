"use client";
import * as React from "react";
import { Message, MessageRole } from "@prisma/client";

type Props = {
  messages?: Message[];
  isSending: boolean;
  isLoading: boolean;
};

const bubbleBase =
  "max-w-[75%] whitespace-pre-wrap leading-relaxed text-sm px-3 py-2 rounded-2xl";
const bubbleUser = "bg-gray-800 text-white rounded-br-sm shadow-sm";
const bubbleAssist =
  "bg-[#1e1f24] text-neutral-100 rounded-bl-sm border border-[#2a2b31]";

function Bubble({
  role,
  children,
}: {
  role: MessageRole;
  children: React.ReactNode;
}) {
  const isUser = role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={[bubbleBase, isUser ? bubbleUser : bubbleAssist].join(" ")}
      >
        <div className="prose prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-code:text-neutral-100 prose-a:underline text-[0.95rem]">
          {children}
        </div>
      </div>
    </div>
  );
}

const TypingBubble = () => (
  <div className="flex justify-start mb-3">
    <div className={[bubbleBase, bubbleAssist].join(" ")}>
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
          style={{ animationDelay: "-0.2s" }}
        />
        <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" />
        <span
          className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"
          style={{ animationDelay: "0.2s" }}
        />
      </div>
    </div>
  </div>
);

const MessageList = ({ messages = [], isSending, isLoading }: Props) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length, isSending, isLoading]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto p-4 bg-[#0b0f19] text-neutral-100"
    >
      {isLoading && (
        <div className="text-sm text-neutral-400 mb-3">Loading…</div>
      )}

      {Array.isArray(messages) &&
        messages.map((m) => (
          <Bubble key={m.id} role={m.role as MessageRole}>
            {m.content}
          </Bubble>
        ))}

      {isSending && <TypingBubble />}
    </div>
  );
};

export default MessageList;
