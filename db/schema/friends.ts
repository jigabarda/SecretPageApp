import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const friends = pgTable("friends", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
