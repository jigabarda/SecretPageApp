"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export default function SecretMessage() {
  const [message, setMessage] = useState("");
  const [existing, setExisting] = useState("");

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("secret_messages")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) setExisting(data.message);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function save() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("secret_messages").upsert({
      user_id: user.id,
      message,
    });

    load();
  }

  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-semibold">Your Secret Message</h2>

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Write your secret..."
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={save} className="bg-blue-600 text-white p-2 rounded">
        Save
      </button>

      <div className="p-4 border rounded bg-gray-50">
        <strong>Existing:</strong> {existing || "No message yet."}
      </div>
    </div>
  );
}
