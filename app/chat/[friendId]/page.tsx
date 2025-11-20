"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ChatWindow from "@/app/components/ChatWindow";
import useUser from "@/lib/useUser";
import Image from "next/image";

type Profile = {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export default function ChatRoomPage() {
  const params = useParams();
  const friendId = params.friendId as string | undefined;
  const { user, loading: userLoading } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load recipient profile
  const loadProfile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setProfile((data as Profile) ?? null);
    } catch (err: unknown) {
      console.error("loadProfile error:", err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  // mark conversation as read (upsert into last_reads)
  const markAsRead = useCallback(async (myId: string, otherId: string) => {
    try {
      // try upsert (if table doesn't exist this will throw; we catch and ignore)
      await supabase.from("last_reads").upsert(
        [
          {
            user_id: myId,
            other_user_id: otherId,
            last_read_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id,other_user_id" }
      );
    } catch {
      // If last_reads doesn't exist or permission error, ignore silently
      // Optionally log for debugging
    }
  }, []);

  // run profile load + initial mark-as-read when page mounts & friendId changes
  useEffect(() => {
    if (!friendId) return;

    void loadProfile(friendId);

    if (user?.id) {
      void markAsRead(user.id, friendId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, user?.id]); // we intentionally avoid including markAsRead/loadProfile in deps to keep behaviour stable

  // also mark as read when tab becomes visible again (user switched back)
  useEffect(() => {
    if (!friendId || !user?.id) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void markAsRead(user.id, friendId);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [friendId, user?.id, markAsRead]);

  // render states
  if (!friendId) return <div className="p-6">Invalid chat link.</div>;
  if (userLoading) return <div className="p-6">Checking auth...</div>;
  if (loading)
    return (
      <div className="p-6">
        <div>Loading chat...</div>
      </div>
    );

  return (
    <div className="min-h-[70vh]">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-3 p-4 bg-white rounded shadow mb-4">
          <Image
            src={profile?.avatar_url ?? "/avatar-placeholder.png"}
            alt={profile?.display_name ?? friendId}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
          <div>
            <div className="text-lg font-semibold">
              {profile?.display_name ?? profile?.email ?? friendId}
            </div>
            <div className="text-sm text-gray-500">Private chat</div>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
        )}

        <ChatWindow recipientId={friendId} />
      </div>
    </div>
  );
}
