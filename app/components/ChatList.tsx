"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

/* ---------- Types ---------- */
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

interface LatestMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

/* ---------- Helper: Relative Time ---------- */
function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;

    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;

    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ChatList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [latestMap, setLatestMap] = useState<Record<string, LatestMessage>>({});
  const [loading, setLoading] = useState(true);

  /* ---------- Get Current User ---------- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  /* ---------- Load All via Single Function ---------- */
  const loadAll = async (uid: string) => {
    // 1) Friends
    const { data: friendsData } = await supabase
      .from("friends")
      .select("*")
      .or(`requester.eq.${uid},receiver.eq.${uid}`)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    const friendList = friendsData ?? [];
    setFriends(friendList);

    // Extract ids of other users
    const friendIds = [
      ...new Set(
        friendList.map((f) => (f.requester === uid ? f.receiver : f.requester))
      ),
    ];

    // 2) Profiles
    if (friendIds.length === 0) {
      setProfiles({});
    } else {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", friendIds);

      const map: Record<string, Profile> = {};
      profileRows?.forEach((p) => (map[p.id] = p));
      setProfiles(map);
    }

    // 3) Latest Messages
    const { data: latestRows } = await supabase
      .from("latest_messages")
      .select("*")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    const latest: Record<string, LatestMessage> = {};
    latestRows?.forEach((m) => {
      const other = m.sender_id === uid ? m.receiver_id : m.sender_id;
      latest[other] = m;
    });

    setLatestMap(latest);
  };

  /* ---------- Load All When userId Available ---------- */
  useEffect(() => {
    if (!userId) {
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      await loadAll(userId);
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  /* ---------- Realtime Channels ---------- */
  useEffect(() => {
    if (!userId) return;

    // Friends change (accept/unfriend)
    const friendsChannel = supabase
      .channel("friends-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Friend;
          if (row.requester === userId || row.receiver === userId) {
            loadAll(userId);
          }
        }
      )
      .subscribe();

    // Messages change (this updates last message immediately)
    const msgChannel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as LatestMessage;
          if (!row) return;

          if (row.sender_id !== userId && row.receiver_id !== userId) return;

          const other =
            row.sender_id === userId ? row.receiver_id : row.sender_id;

          setLatestMap((prev) => ({
            ...prev,
            [other]: row,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [userId]);

  /* ---------- SORT: newest chat at top ---------- */
  const sortedFriends = [...friends].sort((a, b) => {
    const otherA = a.requester === userId ? a.receiver : a.requester;
    const otherB = b.requester === userId ? b.receiver : b.requester;

    const tsA = latestMap[otherA]?.created_at;
    const tsB = latestMap[otherB]?.created_at;

    if (tsA && tsB) return new Date(tsB).getTime() - new Date(tsA).getTime();
    if (tsA) return -1;
    if (tsB) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  /* ---------- UI ---------- */
  if (loading) return <div>Loading chats...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Chats</h2>

      {sortedFriends.length === 0 && (
        <div className="text-gray-500">No friends yet.</div>
      )}

      <ul className="space-y-2">
        {sortedFriends.map((f) => {
          const otherId = f.requester === userId ? f.receiver : f.requester;
          const profile = profiles[otherId];
          const last = latestMap[otherId];

          const preview = last
            ? last.content.length > 60
              ? last.content.slice(0, 57) + "..."
              : last.content
            : "No messages yet";

          const isUnread = last && last.sender_id !== userId;

          return (
            <li key={f.id} className="border p-3 rounded hover:bg-gray-50">
              <Link
                href={`/chat/${otherId}`}
                className="flex items-center gap-3"
              >
                <Image
                  src={profile?.avatar_url || "/avatar-placeholder.png"}
                  alt={profile?.display_name || "User"}
                  width={44}
                  height={44}
                  className="rounded-full object-cover"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="truncate">
                      <div
                        className={`truncate ${
                          isUnread ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {profile?.display_name ||
                          profile?.email ||
                          "Unknown User"}
                      </div>

                      <div className="text-sm text-gray-500 truncate">
                        {preview}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 ml-3">
                      {last ? formatTime(last.created_at) : ""}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
