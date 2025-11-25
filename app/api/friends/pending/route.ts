import { db } from "@/db/drizzle";
import { friends } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400 }
      );
    }

    const results = await db.query.friends.findMany({
      where: and(
        eq(friends.receiverId, userId), // userId is a string (UUID)
        eq(friends.status, "PENDING")
      ),
      with: {
        sender: true, // includes sender user info
      },
    });

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
