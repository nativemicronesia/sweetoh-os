type FlashBannerProps = {
  message?: string;
  variant?: "error" | "success";
};

export function FlashBanner({
  message,
  variant = "error",
}: FlashBannerProps) {
  if (!message) {
    return null;
  }

  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role="alert">
      {message}
    </div>
  );
}
