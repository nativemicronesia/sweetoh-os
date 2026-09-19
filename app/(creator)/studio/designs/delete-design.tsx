"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDesignAction } from "../actions/designs";

export function DeleteDesignButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="cs-btn cs-btn-ghost cs-btn-sm"
      aria-label={`Delete ${name}`}
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete “${name}”? This can't be undone.`)) start(() => deleteDesignAction(id));
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}
