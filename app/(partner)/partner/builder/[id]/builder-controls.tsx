"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmProductAction, generateBlankAction } from "../../actions/builder";

export function BuilderControls({ id, confirmed, blank, canGenerate, hasMockup }: { id: string; confirmed: boolean; blank: boolean; canGenerate: boolean; hasMockup: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => { const result = await action(); if (result.error) setError(result.error); else router.refresh(); });
  }
  return <div className="space-y-3">
    {!confirmed && <button className="so-btn-primary" disabled={pending} onClick={() => run(() => confirmProductAction(id))}>Save this blank to my library</button>}
    {confirmed && blank && canGenerate && !hasMockup && <button className="so-btn-primary" disabled={pending} onClick={() => run(() => generateBlankAction(id))}>Generate clean blank preview</button>}
    {pending && <p role="status" className="text-sm so-muted">Preparing… keep this page open. Image generation can take a couple of minutes.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
