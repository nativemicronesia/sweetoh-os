import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customer } from "./commerce";
import { venture } from "./venture";

export type InboxCategory = "customers" | "orders" | "services" | "other";

export type InboxAttachment = {
  id: string;
  filename: string | null;
  contentType: string | null;
  size?: number | null;
};

/** One conversation with one person (a customer, Stripe, Printify…). */
export const inboxThread = pgTable(
  "inbox_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    counterpartEmail: text("counterpart_email").notNull(),
    counterpartName: text("counterpart_name"),
    category: text("category").$type<InboxCategory>().notNull().default("other"),
    customerId: uuid("customer_id").references(() => customer.id, { onDelete: "set null" }),
    messageCount: integer("message_count").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    unread: boolean("unread").notNull().default(true),
    starred: boolean("starred").notNull().default(false),
    spam: boolean("spam").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inbox_thread_venture_idx").on(table.ventureId, table.archivedAt, table.lastMessageAt),
    index("inbox_thread_counterpart_idx").on(table.ventureId, table.counterpartEmail),
  ],
);

/** A single email in or out. Inbound rows come from the Resend receiving webhook. */
export const inboxMessage = pgTable(
  "inbox_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => inboxThread.id, { onDelete: "cascade" }),
    direction: text("direction").$type<"in" | "out">().notNull(),
    resendEmailId: text("resend_email_id"),
    /** RFC Message-ID, used to thread replies. */
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    toEmails: jsonb("to_emails").$type<string[]>().notNull().default([]),
    ccEmails: jsonb("cc_emails").$type<string[]>().notNull().default([]),
    subject: text("subject").notNull(),
    textBody: text("text_body"),
    htmlBody: text("html_body"),
    snippet: text("snippet"),
    attachments: jsonb("attachments").$type<InboxAttachment[]>().notNull().default([]),
    authentication: jsonb("authentication").$type<{ spf?: string; dkim?: string; dmarc?: string } | null>(),
    forwardedAt: timestamp("forwarded_at", { withTimezone: true }),
    forwardError: text("forward_error"),
    sentByUserId: uuid("sent_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inbox_message_resend_unique").on(table.resendEmailId),
    index("inbox_message_thread_idx").on(table.threadId, table.createdAt),
    index("inbox_message_message_id_idx").on(table.ventureId, table.messageId),
  ],
);
