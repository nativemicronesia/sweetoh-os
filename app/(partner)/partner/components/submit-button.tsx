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
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  variant?: "default" | "outline";
  size?: "sm" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size={size}
      name={name}
      value={value}
      variant={variant}
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
