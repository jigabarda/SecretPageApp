import Navbar from "@/app/components/Navbar";
import dynamic from "next/dynamic";
const SecretEditor = dynamic(() => import("@/app/components/SecretEditor"), {
  ssr: false,
});

export default function Page2() {
  return (
    <div>
      <Navbar />
      <main className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold">Secret Page 2</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add or overwrite your secret. Others cannot view this unless they are
          friends.
        </p>

        <SecretEditor />
      </main>
    </div>
  );
}
