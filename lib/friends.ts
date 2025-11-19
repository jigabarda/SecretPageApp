import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function acceptFriendRequest(id: string) {
  const { error } = await supabase.rpc("accept_friend_request", {
    req_id: id,
  });

  if (error) throw error;
}

export async function rejectFriendRequest(id: string) {
  const { error } = await supabase.rpc("reject_friend_request", {
    req_id: id,
  });

  if (error) throw error;
}
