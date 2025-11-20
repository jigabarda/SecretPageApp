// app/components/ChatWindow.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import useUser from "@/lib/useUser";
import Image from "next/image";

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

type Props = {
  recipientId: string | null;
};

export default function ChatWindow({ recipientId }: Props) {
  const { user, loading } = useUser();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  /** ---------------------------------------------------
   * Load conversation + profiles
   ---------------------------------------------------- */
  const loadConversation = useCallback(
    async (uid: string, rid: string) => {
      const { data: messageRows } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${uid},receiver_id.eq.${rid}),and(sender_id.eq.${rid},receiver_id.eq.${uid})`
        )
        .order("created_at", { ascending: true });

      setMessages((messageRows ?? []) as MessageRow[]);

      // Load both profiles
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", [uid, rid]);

      const map: Record<string, Profile> = {};
      (profRows ?? []).forEach((p) => (map[p.id] = p));
      setProfiles(map);
    },
    []
  );

  /** ---------------------------------------------------
   * Load conversation when user or recipient changes
   ---------------------------------------------------- */
  useEffect(() => {
    if (!user || !recipientId) return;
    const fetchConversation = async () => {
      await loadConversation(user.id, recipientId);
    };
    fetchConversation();
  }, [user, recipientId, loadConversation]);

  /** ---------------------------------------------------
   * Real-time subscription
   ---------------------------------------------------- */
  useEffect(() => {
    if (!user || !recipientId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as MessageRow;

          const belongsToThisChat =
            (m.sender_id === user.id && m.receiver_id === recipientId) ||
            (m.sender_id === recipientId && m.receiver_id === user.id);

          if (belongsToThisChat) {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, recipientId]);

  /** ---------------------------------------------------
   * Auto-scroll on new messages
   ---------------------------------------------------- */
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  /** ---------------------------------------------------
   * Send Message
   ---------------------------------------------------- */
  const sendMessage = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!user || !recipientId) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      // Local optimistic message
      const temp: MessageRow = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: recipientId,
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, temp]);
      setText("");

      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: recipientId,
        content: trimmed,
      });
    },
    [user, recipientId, text]
  );

  /** ---------------------------------------------------
   * RENDER
   ---------------------------------------------------- */
  if (loading) return <div>Loading chat...</div>;
  if (!recipientId)
    return (
      <div className="p-6 bg-white rounded shadow">Select a conversation</div>
    );

  const friend = profiles[recipientId];

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded shadow">
      {/* HEADER */}
      <header className="flex items-center gap-3 p-4 border-b">
        <Image
          src={friend?.avatar_url ?? "/avatar-placeholder.png"}
          alt={friend?.display_name ?? ""}
          width={40}
          height={40}
          className="rounded-full"
        />
        <div>
          <div className="font-semibold">
            {friend?.display_name ?? recipientId}
          </div>
          <div className="text-sm text-gray-500">Private chat</div>
        </div>
      </header>

      {/* MESSAGES */}
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m) => {
          const mine = user ? m.sender_id === user.id : false;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-lg max-w-xs ${
                  mine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.content}
                <div className="text-[10px] opacity-70 mt-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* INPUT */}
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Send
        </button>
      </form>
    </div>
  );
}
