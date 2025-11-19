import Navbar from "@/app/components/Navbar";
import FriendsList from "@/app/components/FriendsList";
import FriendMessages from "@/app/components/FriendMessages";

export default function Page3() {
  return (
    <div>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Secret Page 3</h1>

        <FriendsList />
        <FriendMessages />
      </div>
    </div>
  );
}
