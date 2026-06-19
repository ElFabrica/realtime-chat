"use client";

import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TelegramContact = {
  chatId: string;
  name: string;
  username?: string;
  addedAt: number;
};

type TelegramMessage = {
  id: string;
  chatId: string;
  text: string;
  direction: "sent" | "received";
  timestamp: number;
};

export default function TelegramPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const phoneId = params.phoneId as string;

  const [input, setInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChatId, setNewChatId] = useState("");
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: contactsData } = useQuery({
    queryKey: ["telegram", "contacts"],
    queryFn: async () => {
      const res = await client.telegram.contacts.get();
      return res.data?.contacts ?? [];
    },
  });

  const contacts = (contactsData ?? []) as TelegramContact[];
  const selectedContact = contacts.find((c) => c.chatId === phoneId);

  const { data: messagesData } = useQuery({
    queryKey: ["telegram", "messages", phoneId],
    queryFn: async () => {
      const res = await client.telegram.messages.get({
        query: { chatId: phoneId },
      });
      return res.data?.messages ?? [];
    },
    enabled: !!phoneId,
  });

  const messages = (messagesData ?? []) as TelegramMessage[];

  const { mutate: addContact, isPending: isAddingContact } = useMutation({
    mutationFn: async () => {
      await client.telegram.contacts.post({
        chatId: newChatId.trim(),
        name: newName.trim(),
        username: newUsername.trim() || undefined,
      });
    },
    onSuccess: () => {
      const id = newChatId.trim();
      queryClient.invalidateQueries({ queryKey: ["telegram", "contacts"] });
      setShowAddForm(false);
      setNewChatId("");
      setNewName("");
      setNewUsername("");
      router.push(`/telegram/${id}`);
    },
  });

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (text: string) => {
      await client.telegram.send.post({ chatId: phoneId, text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["telegram", "messages", phoneId],
      });
    },
  });

  const { mutate: syncMessages, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      await client.telegram.sync.get();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["telegram", "messages", phoneId],
      });
      queryClient.invalidateQueries({ queryKey: ["telegram", "contacts"] });
    },
  });

  const handleSend = () => {
    if (!input.trim() || isSending || !selectedContact) return;
    sendMessage(input.trim());
    setInput("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      <header className="border-b border-zinc-800 px-4 py-3 bg-zinc-900/30 flex items-center gap-3">
        <span className="text-green-500 font-bold text-sm">{">"}</span>
        <span className="text-zinc-200 font-bold text-sm">telegram_bot</span>
        <span className="text-zinc-700 text-xs ml-auto">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-60 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-900/10">
          <div className="p-2 border-b border-zinc-800">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="w-full text-left text-[11px] font-bold text-zinc-500 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 px-3 py-2 transition-colors"
            >
              {showAddForm ? "─ CANCEL" : "+ ADD CONTACT"}
            </button>
          </div>

          {showAddForm && (
            <div className="p-2 border-b border-zinc-800 space-y-1.5">
              <input
                autoFocus
                placeholder="Chat ID *"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder:text-zinc-700 px-2.5 py-1.5 text-[11px]"
              />
              <input
                placeholder="Display name *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newChatId.trim() && newName.trim())
                    addContact();
                }}
                className="w-full bg-black border border-zinc-700 focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder:text-zinc-700 px-2.5 py-1.5 text-[11px]"
              />
              <input
                placeholder="@username (optional)"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-black border border-zinc-700 focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder:text-zinc-700 px-2.5 py-1.5 text-[11px]"
              />
              <button
                onClick={() => addContact()}
                disabled={
                  !newChatId.trim() || !newName.trim() || isAddingContact
                }
                className="w-full text-[11px] font-bold bg-zinc-100 text-black py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                {isAddingContact ? "SAVING..." : "SAVE"}
              </button>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-zinc-700 text-[11px] text-center p-6 leading-relaxed">
                No contacts yet.
                <br />
                Add one above.
              </p>
            ) : (
              contacts.map((contact) => {
                const isActive = contact.chatId === phoneId;
                return (
                  <button
                    key={contact.chatId}
                    onClick={() =>
                      router.push(`/room/telegram/${contact.chatId}`)
                    }
                    className={cn(
                      "w-full text-left px-3 py-3 border-b border-zinc-800/40 transition-colors flex items-start gap-2",
                      isActive
                        ? "bg-zinc-800/70 border-l-2 border-l-green-500"
                        : "hover:bg-zinc-800/30",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[8px] mt-[5px] shrink-0",
                        isActive ? "text-green-500" : "text-zinc-600",
                      )}
                    >
                      ●
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[11px] font-bold truncate",
                          isActive ? "text-zinc-100" : "text-zinc-300",
                        )}
                      >
                        {contact.name}
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate">
                        {contact.username
                          ? `@${contact.username}`
                          : `id: ${contact.chatId}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </nav>
        </aside>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-zinc-800 px-4 py-2.5 bg-zinc-900/20 flex items-center justify-between">
            {selectedContact ? (
              <div>
                <p className="text-sm font-bold text-zinc-100">
                  {selectedContact.name}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {selectedContact.username
                    ? `@${selectedContact.username} · `
                    : ""}
                  id: {selectedContact.chatId}
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 font-mono">
                select a contact
              </p>
            )}

            <button
              onClick={() => syncMessages()}
              disabled={isSyncing}
              title="Pull new messages from Telegram"
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSyncing ? "SYNCING..." : "↓ SYNC"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedContact && (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-700 text-sm font-mono">
                  select or add a contact to start chatting.
                </p>
              </div>
            )}

            {selectedContact && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-zinc-700 text-sm font-mono">
                  no messages yet — send one or sync.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isSent = msg.direction === "sent";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    isSent ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%]",
                      isSent ? "text-right" : "text-left",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[10px] font-bold mb-1",
                        isSent ? "text-green-500" : "text-blue-400",
                      )}
                    >
                      {isSent ? "YOU" : (selectedContact?.name ?? phoneId)}
                    </p>
                    <p className="text-sm text-zinc-300 leading-relaxed break-words border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                      {msg.text}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {format(Number(msg.timestamp), "HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm select-none">
                  {">"}
                </span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) handleSend();
                  }}
                  disabled={!selectedContact || isSending}
                  placeholder={
                    selectedContact
                      ? "Type message..."
                      : "Select a contact first"
                  }
                  className="w-full bg-black border border-zinc-800 focus:border-zinc-600 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm disabled:opacity-40"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || !selectedContact || isSending}
                className="bg-zinc-800 text-zinc-400 px-5 text-xs font-bold hover:text-zinc-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSending ? "..." : "SEND"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
