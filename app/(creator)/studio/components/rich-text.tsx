import Link from "next/link";
import { Fragment } from "react";

/**
 * Tiny, safe renderer for Skink replies: paragraphs, bullet/numbered lists,
 * **bold**, `code`, [links](/path) and bare /studio… or https links.
 * Builds React nodes only — never injects HTML.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:\/[^\s)]*|https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)]+|\/(?:studio|create|collections|products)[\w\-/?=&%.]*)/g;

function anchor(href: string, label: string, key: number) {
  const clean = href.replace(/[.,;:!?]+$/, "");
  if (clean.startsWith("/")) return <Link key={key} href={clean}>{label === href ? clean : label}</Link>;
  return (
    <a key={key} href={clean} target="_blank" rel="noopener noreferrer">
      {label === href ? clean.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48) : label}
    </a>
  );
}

function inline(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const token = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (token.startsWith("**")) out.push(<strong key={i++}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={i++}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/) ?? [];
      out.push(anchor(href ?? "", label ?? token, i++));
    } else {
      const trailing = token.match(/[.,;:!?]+$/)?.[0] ?? "";
      out.push(anchor(token, token, i++));
      if (trailing) out.push(trailing);
    }
    last = at + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const bullet = lines.length > 0 && lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (bullet) {
          const ordered = /^\s*\d/.test(lines[0]);
          const items = lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>);
          return ordered ? <ol key={b} style={{ margin: "6px 0", paddingLeft: 20 }}>{items}</ol> : <ul key={b} style={{ margin: "6px 0", paddingLeft: 18 }}>{items}</ul>;
        }
        return (
          <p key={b} style={{ margin: b ? "10px 0 0" : 0 }}>
            {lines.map((l, k) => (
              <Fragment key={k}>
                {k > 0 && <br />}
                {inline(l.replace(/^#{1,4}\s+/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
