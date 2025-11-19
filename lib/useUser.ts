// app/lib/useUser.ts
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type UserInfo = {
  id: string;
  email?: string | null;
};

export default function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data?.user ?? null;
      if (u) setUser({ id: u.id, email: u.email });
      else setUser(null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) setUser({ id: u.id, email: u.email });
      else setUser(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
