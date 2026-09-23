import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * The padlock over Create with Sweet'Oh while it's closed. The page underneath
 * is faded and inert (readable, nothing clickable); this stays pinned while
 * visitors scroll.
 */
export function CreateLock() {
  return (
    <div className="cw-lock" role="status">
      <div className="cw-lock-card">
        <span className="cw-lock-icon" aria-hidden>
          <Lock size={22} strokeWidth={2.4} />
        </span>
        <div>
          <p className="cw-lock-title">Create with Sweet&apos;Oh is locked — opening soon</p>
          <p className="cw-lock-text">Have a look around. For now, shop our pieces or ask the shop to make something just for you.</p>
        </div>
        <div className="cw-lock-actions">
          <Link href="/collections" className="cw-lock-btn">Shop</Link>
          <Link href="/custom" className="cw-lock-btn cw-lock-btn-ghost">Custom orders</Link>
        </div>
      </div>
    </div>
  );
}
