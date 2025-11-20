"use client";

import { useParams } from "next/navigation";
import ChatList from "@/app/components/ChatList";
import ChatWindow from "@/app/components/ChatWindow";

export default function ChatRoomPage() {
  const params = useParams();
  const friendId = params.friendId as string;

  if (!friendId) {
    return <div className="p-6">Invalid chat link.</div>;
  }

  return (
    <div className="flex h-[100vh]">
      {/* LEFT PANEL — Chat List (hidden on mobile) */}
      <div className="hidden md:block w-1/3 border-r overflow-auto p-4 bg-white">
        <ChatList />
      </div>

      {/* RIGHT PANEL — Chat Window */}
      <div className="flex-1 overflow-auto p-4">
        <ChatWindow recipientId={friendId} />
      </div>
    </div>
  );
}
