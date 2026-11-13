import { cn } from "@/lib/cn";

export type CardCredit = { author: string; licence: string; sourceUrl: string } | null;

/**
 * Card front image. Raster images render as-is. In-house SVG diagrams draw in currentColor,
 * which an <img> cannot inherit, so they render as a mask over an ink fill: the shapes keep
 * their own opacities and follow the theme. An invisible <img> gives the mask its aspect ratio.
 */
export function CardImage({
  src,
  alt,
  credit,
  size = "md",
  className,
}: {
  src: string;
  alt: string;
  credit: CardCredit;
  size?: "md" | "lg";
  className?: string;
}) {
  const isSvg = src.toLowerCase().endsWith(".svg");
  const maxH = size === "lg" ? "max-h-[40vh]" : "max-h-40";
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-center rounded-md border border-hairline bg-tint p-3">
        {isSvg ? (
          <div role="img" aria-label={alt} className="relative w-full max-w-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- sizing box for the mask */}
            <img src={src} alt="" aria-hidden className={cn("invisible mx-auto block h-auto w-full object-contain", maxH)} loading="lazy" />
            <div
              aria-hidden
              className="absolute inset-0 bg-fg"
              style={{
                maskImage: `url("${src}")`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskImage: `url("${src}")`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- static content files, sizes vary
          <img src={src} alt={alt} loading="lazy" className={cn("block h-auto w-auto max-w-full rounded-sm object-contain", maxH)} />
        )}
      </div>
      {credit && <CreditLine credit={credit} />}
    </figure>
  );
}

/** author · licence · source link, under every sourced image. */
export function CreditLine({ credit }: { credit: NonNullable<CardCredit> }) {
  return (
    <figcaption className="text-caption text-mute">
      <span title={credit.author}>{credit.author.length > 60 ? `${credit.author.slice(0, 57).trimEnd()}…` : credit.author}</span> ·{" "}
      {credit.licence} ·{" "}
      <a
        href={credit.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-hairline underline-offset-2 hover:text-fg hover:decoration-fg"
      >
        source
      </a>
    </figcaption>
  );
}

export const CATEGORY_LABELS: Record<string, string> = {
  "art-movement": "Art movements",
  "indian-painting": "Indian painting",
  "indian-dance": "Indian dance",
  "indian-monument": "Indian monuments",
  "craft-process": "Craft processes",
  anthropometry: "Anthropometry",
  gestalt: "Gestalt",
  "ui-component": "UI components",
  "design-icon": "Design icons",
  "indian-design-history": "Indian design history",
  "colour-and-type": "Colour and type",
};

export const PRIORITY_LABELS: Record<string, string> = {
  P1: "asked in a paper",
  P2: "likely",
  P3: "canon",
};
