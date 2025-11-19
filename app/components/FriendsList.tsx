"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface FriendRequest {
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

export default function FriendsList() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /** ---------------------------------------
   *  LOAD USER
   ---------------------------------------- */
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

  /** ---------------------------------------
   *  LOAD FRIEND REQUESTS + PROFILES
   ---------------------------------------- */
  const loadRequests = useCallback(async () => {
    if (!currentUserId) return;

    // fetch friend requests
    const { data } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`requester.eq.${currentUserId},receiver.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as FriendRequest[];
    setRequests(rows);

    // get other user IDs
    const ids = Array.from(
      new Set(
        rows.map((r) =>
          r.requester === currentUserId ? r.receiver : r.requester
        )
      )
    );

    if (ids.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email")
      .in("id", ids);

    const map: Record<string, Profile> = {};
    (profileData ?? []).forEach((p) => {
      map[p.id] = p;
    });
    setProfiles(map);
  }, [currentUserId]);

  /** ---------------------------------------
   *  LOAD WHEN currentUserId CHANGES
   ---------------------------------------- */
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await loadRequests();
      if (!controller.signal.aborted) setLoading(false);
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [currentUserId, loadRequests]);

  /** ---------------------------------------
   *  REALTIME LISTENER for ACCEPTED requests
   ---------------------------------------- */
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("friend-requests-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friend_requests",
        },
        (payload) => {
          const updated = payload.new as FriendRequest;

          if (updated.status === "accepted") {
            void loadRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadRequests]);

  /** ---------------------------------------
   *  SEND REQUEST
   ---------------------------------------- */
  const sendRequest = useCallback(async () => {
    if (!currentUserId || !newFriendEmail) return;

    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", newFriendEmail)
      .maybeSingle();

    if (!user?.id) {
      alert("User not found");
      return;
    }

    await supabase.from("friend_requests").insert({
      requester: currentUserId,
      receiver: user.id,
      status: "pending",
    });

    setNewFriendEmail("");
  }, [currentUserId, newFriendEmail]);

  /** ---------------------------------------
   *  ACCEPT REQUEST
   ---------------------------------------- */
  const acceptRequest = useCallback(async (id: string) => {
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", id);
  }, []);

  if (loading) return <div>Loading...</div>;

  /** ---------------------------------------
   *  UI
   ---------------------------------------- */
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Friends</h2>

      {/* SEND REQUEST */}
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Friend's email"
          value={newFriendEmail}
          onChange={(e) => setNewFriendEmail(e.target.value)}
          className="border rounded p-2 flex-1"
        />
        <button
          onClick={() => void sendRequest()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>

      {/* LIST */}
      <ul className="space-y-2">
        {requests.map((req) => {
          const otherUserId =
            req.requester === currentUserId ? req.receiver : req.requester;

          const p = profiles[otherUserId];

          return (
            <li
              key={req.id}
              className="border p-3 rounded flex items-center gap-3"
            >
              <Image
                src={p?.avatar_url ?? "/avatar-placeholder.png"}
                alt="avatar"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1">
                <div className="font-medium">
                  {p?.display_name ?? p?.email ?? "Unknown"}
                </div>
                <div className="text-sm text-gray-500">{req.status}</div>
              </div>

              {/* Accept button */}
              {req.status === "pending" && req.receiver === currentUserId && (
                <button
                  onClick={() => void acceptRequest(req.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Accept
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
