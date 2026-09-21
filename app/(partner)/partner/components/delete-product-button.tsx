"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "./submit-button";

/** Two-step delete: the first click asks, the second deletes. */
export function DeleteProductButton({ action }: { action: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button type="button" size="lg" variant="outline" onClick={() => setAsking(true)}>
        Delete
      </Button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Delete this product for good?</span>
      <SubmitButton pendingLabel="Deleting…">Yes, delete</SubmitButton>
      <Button type="button" size="lg" variant="outline" onClick={() => setAsking(false)}>
        Keep it
      </Button>
    </form>
  );
}
