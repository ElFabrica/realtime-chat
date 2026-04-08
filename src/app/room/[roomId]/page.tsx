"use client";

import { useUsername } from "@/hooks/use-username";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function formarTimeRemaining(secounds: number) {
  // 121 seconds

  const mins = Math.floor(secounds / 60);
  const secs = secounds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Page() {
  const params = useParams();

  const router = useRouter();
  const { userName } = useUsername();
  const roomId = params.roomId as string;
  const [copyStatus, setCopyStatus] = useState("COPY");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.room.get({
        query: { roomId },
      });
      return res.data?.messages || [];
    },
  });
  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: userName,
          text,
        },
        {
          query: { roomId },
        },
      );
    },
  });
  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } });
    },
  });

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({
        query: { roomId },
      });
      return res.data?.ttl;
    },
  });

  const copyLink = () => {
    const url = window.location.href;

    navigator.clipboard.writeText(url);

    setCopyStatus("COPIED!");

    setTimeout(() => {
      setCopyStatus("COPY");
    }, 2000);
  };

  async function handleSendMessage(text: string) {
    sendMessage({ text });

    setInput("");
  }

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        refetch();
      }
      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });

  useEffect(() => {
    if (ttlData !== undefined) {
      setTimeRemaining(ttlData);
    }
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;
    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b border-zinc-800 p-4 flex justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-500">{roomId}</span>
              <button
                onClick={copyLink}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 p-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copyStatus}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">
              Self-Destruct
            </span>

            <span
              className={cn(
                `text-sm font-bold flex items-center gap-2`,
                timeRemaining !== null && timeRemaining < 60
                  ? "text-red-500"
                  : "text-amber-500",
              )}
            >
              {timeRemaining !== null
                ? formarTimeRemaining(timeRemaining)
                : "--:--"}
            </span>
          </div>
        </div>
        <button
          onClick={() => destroyRoom()}
          className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
        >
          <span className="group-hover:animate-pulse">💣</span>
          DESTROY NOW
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages?.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm font-mono">
              No messages yet, start the conversation.
            </p>
          </div>
        )}
        {messages?.map((msg) => {
          const isMe = msg.sender === userName;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col",
                isMe ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] group flex flex-col",
                  isMe ? "items-end text-right" : "items-start text-left",
                )}
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isMe ? "text-green-500" : "text-blue-500",
                    )}
                  >
                    {isMe ? "YOU" : msg.sender}
                  </span>

                  <span className="text-[10px] text-zinc-600">
                    {format(msg.timestamp, "HH:mm")}
                  </span>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed break-all">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-zinc-800  bg-zinc-900/30 ">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 ">
              {">"}
            </span>
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !isPending) {
                  handleSendMessage(input);
                  inputRef.current?.focus();
                }
              }}
              autoFocus
              placeholder={"Type message..."}
              type="text"
              className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
            />
          </div>
          <button
            onClick={() => {
              handleSendMessage(input);
            }}
            disabled={!input.trim() || isPending}
            className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}
