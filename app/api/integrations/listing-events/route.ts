import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/domains/identity/service";
import { listUndeliveredListingEvents } from "@/lib/domains/catalog/service";

/**
 * Stub consumer endpoint for venture sites (Island Sprouts, etc.).
 * GET undelivered product.listing.approved events from the outbox.
 * Auth: partner workspace session for now (service token later).
 */
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      session.role !== "partner" &&
      session.role !== "owner" &&
      session.role !== "creator"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "creator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const events = await listUndeliveredListingEvents(session.ventureId);
    return NextResponse.json({
      eventType: "product.listing.approved",
      count: events.length,
      events: events.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        payload: row.payload,
        createdAt: row.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
