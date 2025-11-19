"use client";

import { useParams } from "next/navigation";
import ChatWindow from "@/app/components/ChatWindow";

export default function ChatRoomPage() {
  const params = useParams();
  const friendId = params.friendId as string;

  if (!friendId) return <div>Invalid chat link.</div>;

  return (
    <div className="h-full">
      <ChatWindow recipientId={friendId} />
    </div>
  );
}
