"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  disabled = false,
  name,
  value,
  variant = "default",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      name={name}
      value={value}
      variant={variant}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
