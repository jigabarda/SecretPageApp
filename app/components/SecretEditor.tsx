"use client";
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface SecretMessageRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export default function SecretEditor() {
  const [message, setMessage] = useState<string>("");
  const [existing, setExisting] = useState<string>("");

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data } = await supabase
      .from("secret_messages")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<SecretMessageRow>();

    if (data) {
      setExisting(data.message);
    }
  }, []);

  async function save() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    await supabase
      .from("secret_messages")
      .upsert({
        user_id: user.id,
        message,
      })
      .returns<SecretMessageRow>();

    load();
  }

  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-semibold">Secret Message</h2>

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Write your secret..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button
        onClick={save}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save
      </button>

      <div className="mt-4 p-3 border rounded bg-gray-100">
        <strong>Existing:</strong> {existing || "Nothing saved yet."}
      </div>
    </div>
  );
}
