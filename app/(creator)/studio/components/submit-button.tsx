"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children, className = "cs-btn cs-btn-primary", style, disabled }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} disabled={pending || disabled} aria-busy={pending}>
      {pending ? <Loader2 size={16} className="pe-spin" /> : null}
      {children}
    </button>
  );
}
