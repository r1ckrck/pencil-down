import { cn } from "@/lib/cn";

/**
 * Renders TRUSTED SVG markup from the Part A generators (never user input).
 * Generator vocabulary: ink = currentColor, class "mute" = secondary ink, class "soft" = faint fill
 * (styled in globals.css under .figure). Root width/height are stripped so the viewBox scales
 * to the container; `maxWidth` caps it on large screens.
 */
export function Figure({
  svg,
  label,
  caption,
  maxWidth = 560,
  framed = false,
  className,
}: {
  svg: string;
  /** Accessible description of the figure. */
  label: string;
  caption?: string;
  maxWidth?: number;
  framed?: boolean;
  className?: string;
}) {
  const markup = svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
    const cleaned = attrs
      .replace(/\s(width|height)="[^"]*"/g, "")
      .replace(/\saria-hidden="[^"]*"/g, "");
    return `<svg${cleaned} width="100%" aria-hidden="true" focusable="false">`;
  });
  return (
    <figure className={cn("w-full", className)} style={{ maxWidth }}>
      <div
        role="img"
        aria-label={label}
        className={cn(
          "figure text-fg [&>svg]:block [&>svg]:h-auto [&>svg]:w-full",
          framed && "rounded-md border border-hairline p-4",
        )}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {caption && <figcaption className="mt-2 font-mono text-caption text-mute">{caption}</figcaption>}
    </figure>
  );
}
