import { db } from "@/db/drizzle";
import { friends } from "@/db/schema/friends";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { senderId, receiverId } = await req.json();

    if (!senderId || !receiverId) {
      return Response.json(
        { error: "Missing senderId or receiverId" },
        { status: 400 }
      );
    }

    // Check if request already exists
    const alreadyExists = await db.query.friends.findFirst({
      where: and(
        eq(friends.senderId, senderId),
        eq(friends.receiverId, receiverId)
      ),
    });

    if (alreadyExists) {
      return Response.json({ error: "Request already sent" }, { status: 409 });
    }

    // Insert new friend request
    const result = await db.insert(friends).values({
      senderId,
      receiverId,
      status: "pending",
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error("Friend request error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
