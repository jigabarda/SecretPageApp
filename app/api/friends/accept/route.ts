import { db } from "@/db/drizzle";
import { friends } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { requestId, receiverId } = await req.json();

    if (!requestId || !receiverId) {
      return Response.json(
        { error: "Missing requestId or receiverId" },
        { status: 400 }
      );
    }

    // Validate ownership: only the receiver may accept
    const request = await db.query.friends.findFirst({
      where: and(eq(friends.id, requestId), eq(friends.receiverId, receiverId)),
    });

    if (!request) {
      return Response.json(
        { error: "Friend request not found or unauthorized" },
        { status: 404 }
      );
    }

    if (request.status !== "PENDING") {
      return Response.json(
        { error: "Request is not pending" },
        { status: 409 }
      );
    }

    // Update the status to ACCEPTED
    const result = await db
      .update(friends)
      .set({ status: "ACCEPTED" })
      .where(eq(friends.id, requestId))
      .returning();

    return Response.json({ success: true, result });
  } catch (error) {
    console.error("Accept error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
