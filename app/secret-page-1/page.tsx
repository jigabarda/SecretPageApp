import Navbar from "@/app/components/Navbar";

export default function Page1() {
  return (
    <div>
      <Navbar />
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold">Secret Page 1</h1>
        <p className="mt-4 text-lg">
          🔒 This is your secret message accessible only after login.
        </p>
      </div>
    </div>
  );
}
