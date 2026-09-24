/**
 * Resend's Receiving API over plain fetch (the pinned SDK predates it).
 * Webhooks only carry metadata; bodies and attachments are fetched here.
 * https://resend.com/docs/api-reference/emails/retrieve-received-email
 */
import { getServerEnv } from "@/lib/config/env";

export type ReceivedEmail = {
  id: string;
  to: string[];
  from: string;
  cc?: string[] | null;
  reply_to?: string[] | null;
  created_at: string;
  subject: string | null;
  html: string | null;
  text: string | null;
  headers?: Record<string, string> | null;
  message_id?: string | null;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null;
  attachments?: { id: string; filename?: string | null; content_type?: string | null; size?: number | null; content_disposition?: string | null }[];
};

export type ReceivedAttachment = {
  id: string;
  filename: string | null;
  content_type: string | null;
  size?: number | null;
  content_disposition?: string | null;
  download_url: string;
};

async function resendGet<T>(path: string): Promise<T> {
  const key = getServerEnv().resendApiKey;
  if (!key) throw new Error("Resend is not configured");
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${path} → ${res.status} ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

export function getReceivedEmail(id: string) {
  return resendGet<ReceivedEmail>(`/emails/receiving/${encodeURIComponent(id)}`);
}

export async function listReceivedAttachments(id: string) {
  const res = await resendGet<{ data: ReceivedAttachment[] }>(`/emails/receiving/${encodeURIComponent(id)}/attachments`);
  return res.data ?? [];
}

export async function getReceivedAttachment(emailId: string, attachmentId: string) {
  return resendGet<ReceivedAttachment>(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
}
