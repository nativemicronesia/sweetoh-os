import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { venture } from "./venture";

export const emailSignup = pgTable(
  "email_signup",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("email_signup_venture_email_unique").on(table.ventureId, table.email),
  ],
);
