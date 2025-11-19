"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface SecretMessageRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface Profile {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export default function FriendMessages() {
  const [messages, setMessages] = useState<SecretMessageRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch user once
  useEffect(() => {
    let active = true;
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const user = data?.user ?? null;
      setCurrentUserId(user?.id ?? null);
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  // Load friend messages
  const loadFriendMessages = useCallback(async (userId: string) => {
    // 1. get friends
    const { data: friendRows } = await supabase
      .from("friends")
      .select("*")
      .or(`requester.eq.${userId},receiver.eq.${userId}`)
      .eq("status", "accepted");

    const friends = (friendRows ?? []) as {
      requester: string;
      receiver: string;
    }[];

    if (friends.length === 0) {
      setMessages([]);
      setProfiles({});
      return;
    }

    const friendIds = Array.from(
      new Set(
        friends.map((f) => (f.requester === userId ? f.receiver : f.requester))
      )
    );

    // 2. messages
    const { data: msgRows } = await supabase
      .from("secret_messages")
      .select("*")
      .in("user_id", friendIds);

    setMessages((msgRows ?? []) as SecretMessageRow[]);

    // 3. load profiles
    const { data: profRows } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", friendIds);

    const map: Record<string, Profile> = {};
    (profRows ?? []).forEach((p) => (map[p.id] = p));
    setProfiles(map);
  }, []);

  // Realtime messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("secret_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "secret_messages",
        },
        () => {
          void loadFriendMessages(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadFriendMessages]);

  if (!messages.length)
    return <div className="text-gray-500">No messages yet.</div>;

  return (
    <div className="space-y-3 mt-4">
      <h2 className="text-lg font-semibold">Friends&apos; Messages</h2>

      {messages.map((m) => (
        <div
          key={m.id}
          className="border p-3 rounded flex items-start gap-3 bg-white/70"
        >
          <Image
            alt="avatar"
            src={profiles[m.user_id]?.avatar_url ?? "/avatar-placeholder.png"}
            className="w-10 h-10 rounded-full"
          />

          <div>
            <div className="font-semibold">
              {profiles[m.user_id]?.display_name ?? m.user_id}
            </div>
            <div className="text-gray-700">{m.message}</div>
            <div className="text-xs text-gray-400">{m.created_at}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
