"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

interface Friend {
  id: string;
  requester: string;
  receiver: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

interface Profile {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export default function ChatList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------
  // 1. GET CURRENT USER
  // -------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      setUserId(data?.user?.id ?? null);
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  // -------------------------------------------------
  // 2. LOAD FRIEND LIST + PROFILES
  // -------------------------------------------------
  const loadFriends = async (uid: string) => {
    const { data: friendRows } = await supabase
      .from("friends")
      .select("*")
      .or(`requester.eq.${uid},receiver.eq.${uid}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    const list = friendRows ?? [];
    setFriends(list);

    // collect opposite-user IDs
    const ids = Array.from(
      new Set(list.map((f) => (f.requester === uid ? f.receiver : f.requester)))
    );

    if (ids.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email")
      .in("id", ids);

    const map: Record<string, Profile> = {};
    (profileRows ?? []).forEach((p) => (map[p.id] = p));
    setProfiles(map);
  };

  // run loadFriends once userId is known
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!userId) return;
      setLoading(true);

      await loadFriends(userId);

      if (mounted) setLoading(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // -------------------------------------------------
  // 3. REALTIME FRIEND UPDATES
  // -------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("friends-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends" },
        () => {
          // simply reload; safe with React 19
          if (userId) loadFriends(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // -------------------------------------------------
  // RENDER UI
  // -------------------------------------------------
  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Chats</h2>

      {friends.length === 0 && (
        <div className="text-gray-500">No friends yet.</div>
      )}

      <ul className="space-y-2">
        {friends.map((f) => {
          const otherId = f.requester === userId ? f.receiver : f.requester;
          const p = profiles[otherId];

          return (
            <Link key={f.id} href={`/chat/${otherId}`}>
              <li className="border p-3 rounded flex items-center gap-3 hover:bg-gray-100 cursor-pointer">
                <Image
                  src={p?.avatar_url ?? "/avatar-placeholder.png"}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <div className="font-semibold">
                    {p?.display_name || p?.email || "Unknown user"}
                  </div>
                  <div className="text-sm text-gray-500">Tap to open chat</div>
                </div>
              </li>
            </Link>
          );
        })}
      </ul>
    </div>
  );
}
