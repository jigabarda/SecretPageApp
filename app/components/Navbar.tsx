"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function deleteAccount() {
    await supabase.rpc("delete_user"); // we will create this RPC
    logout();
  }

  return (
    <nav className="p-4 bg-gray-800 text-white flex justify-between">
      <div className="space-x-4">
        <Link href="/secret-page-1">Page 1</Link>
        <Link href="/secret-page-2">Page 2</Link>
        <Link href="/secret-page-3">Page 3</Link>
      </div>

      <div className="space-x-3">
        <button onClick={logout}>Logout</button>
        <button onClick={deleteAccount} className="text-red-400">
          Delete Account
        </button>
      </div>
    </nav>
  );
}
