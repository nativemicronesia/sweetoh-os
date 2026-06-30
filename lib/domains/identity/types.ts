import type { appUser } from "@/lib/db/schema";

export type AppRole = "owner" | "partner";

export type SessionUser = {
  authUserId: string;
  appUser: typeof appUser.$inferSelect;
  role: AppRole;
  ventureId: string;
  ventureSlug: string;
};

export type SyncAppUserInput = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};
