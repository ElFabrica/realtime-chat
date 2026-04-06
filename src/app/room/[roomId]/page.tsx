"use client";

import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

function formarTimeRemaining(secounds: number) {
  // 121 seconds

  const mins = Math.floor(secounds / 60);
  const secs = secounds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Page() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [copyStatus, setCopyStatus] = useState("COPY");
  const [timeRemaining, settimeRemaining] = useState<number | null>(121);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const copyLink = () => {
    const url = window.location.href;

    navigator.clipboard.writeText(url);

    setCopyStatus("COPIED!");

    setTimeout(() => {
      setCopyStatus("COPY");
    }, 2000);
  };

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
        <button className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50">
          <span className="group-hover:animate-pulse">💣</span>
          DESTROY NOW
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"></div>

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
                if (e.key === "Enter" && input.trim()) {
                  //TODO: SEND MESSAGE;

                  inputRef.current?.focus();
                }
              }}
              autoFocus
              type="text"
              className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm"
            />
          </div>
          <button className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            SEND
          </button>
        </div>
      </div>
    </main>
  );
}
