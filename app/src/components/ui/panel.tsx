import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Eyebrow } from "./label";

/**
 * Hairline frame. No shadow, no fill by default; `tint` for a quiet inset region.
 * Optional drafting header: an index ("01") and an eyebrow label, with an aside on the right.
 */
export function Panel({
  as: Tag = "section",
  index,
  label,
  aside,
  tone = "plain",
  padding = "md",
  className,
  children,
}: {
  as?: ElementType;
  index?: string;
  label?: ReactNode;
  aside?: ReactNode;
  tone?: "plain" | "tint";
  padding?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-hairline",
        tone === "tint" && "bg-tint",
        padding === "sm" && "p-3",
        padding === "md" && "p-4 md:p-6",
        padding === "lg" && "p-6 md:p-8",
        className,
      )}
    >
      {(label || aside) && (
        <header className="mb-4 flex items-baseline justify-between gap-4">
          {label ? <Eyebrow index={index}>{label}</Eyebrow> : <span />}
          {aside && <div className="text-caption text-mute">{aside}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/** Horizontal hairline divider. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-hairline", className)} />;
}
