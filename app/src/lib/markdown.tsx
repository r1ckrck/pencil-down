import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Tiny safe markdown renderer for authored content (card backs, prompts, explanations).
 * Builds React elements, never HTML strings, so nothing in the source can inject markup.
 * Supports: **bold**, *italic* / _italic_, `code`, [links](https://…), "- " / "* " / "1. " lists,
 * "> " quotes, blank-line paragraphs and single-newline line breaks.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function safeHref(href: string): string | null {
  return /^(https?:|mailto:|\/)/i.test(href) ? href : null;
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k} className="font-semibold">{inline(tok.slice(2, -2), k)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded-xs bg-code px-1 font-mono text-[0.9em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const [, label, href] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      const safe = href ? safeHref(href) : null;
      out.push(
        safe ? (
          <a key={k} href={safe} target="_blank" rel="noreferrer noopener" className="underline decoration-hairline underline-offset-2 hover:decoration-fg">
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function lines(block: string[], key: string): ReactNode[] {
  return block.map((l, i) => (
    <Fragment key={`${key}-${i}`}>
      {i > 0 && <br />}
      {inline(l, `${key}-${i}`)}
    </Fragment>
  ));
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const rows = source.replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote = false;

  const flush = () => {
    const k = `b${blocks.length}`;
    if (para.length && quote)
      blocks.push(
        <blockquote key={k} className="border-l-2 border-hairline pl-4">
          {lines(para, k)}
        </blockquote>,
      );
    else if (para.length) blocks.push(<p key={k}>{lines(para, k)}</p>);
    else if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k} className={cn("flex flex-col gap-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
          {list.items.map((it, i) => (
            <li key={i}>{inline(it, `${k}-${i}`)}</li>
          ))}
        </Tag>,
      );
    }
    para = [];
    list = null;
    quote = false;
  };

  for (const row of rows) {
    const bullet = row.match(/^\s*[-*]\s+(.*)$/);
    const numbered = row.match(/^\s*\d+[.)]\s+(.*)$/);
    const quoted = row.match(/^\s*>\s?(.*)$/);
    if (!row.trim()) flush();
    else if (quoted) {
      if (list || (para.length && !quote)) flush();
      quote = true;
      para.push(quoted[1]);
    } else if (bullet || numbered) {
      const ordered = !!numbered;
      if (para.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      if (list || quote) flush();
      para.push(row);
    }
  }
  flush();

  return <div className={cn("flex flex-col gap-3", className)}>{blocks}</div>;
}
