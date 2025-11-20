import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),

  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),

  receiverId: integer("receiver_id")
    .references(() => users.id)
    .notNull(),

  status: text("status").default("pending").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
