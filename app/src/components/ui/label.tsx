import type { ElementType, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Mono caps, tracked, mute: the drafting tag above a region.
 * `index` prints a sub-section number ("01") in front, separated by a hairline tick.
 */
export function Eyebrow({
  as: Tag = "p",
  index,
  className,
  children,
}: {
  as?: ElementType;
  index?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("flex items-center gap-2 font-mono text-label uppercase text-mute", className)}>
      {index && (
        <>
          <span className="text-fg">{index}</span>
          <span aria-hidden className="h-px w-3 bg-hairline" />
        </>
      )}
      <span>{children}</span>
    </Tag>
  );
}

/** Form field label: body face, small, medium weight. */
export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-small font-medium text-fg", className)} {...rest} />;
}

/** Italic role label (design.md motif): a quiet note naming what a region is for. */
export function RoleLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-caption italic text-mute", className)}>{children}</p>;
}
