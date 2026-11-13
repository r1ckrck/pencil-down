"use client";
import { sessionFetch } from "@/lib/session-fetch";

import { useEffect, useState } from "react";
import { Figure } from "@/components/ui/figure";
import { cn } from "@/lib/cn";

const svgCache = new Map<string, string>();

/**
 * One prompt stimulus. SVG stimuli draw in currentColor, which an <img> cannot inherit, so they
 * are fetched from our own /content and inlined through <Figure> (dark mode follows the ink).
 * Raster crops of real papers render as plain images on a hairline frame.
 */
export function Stimulus({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const isSvg = url.toLowerCase().endsWith(".svg");
  const [svg, setSvg] = useState<string | null>(() => (isSvg ? (svgCache.get(url) ?? null) : null));

  useEffect(() => {
    if (!isSvg || svgCache.has(url)) return;
    let alive = true;
    sessionFetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        // Trusted, committed content; still drop anything executable before inlining.
        const clean = text.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
        svgCache.set(url, clean);
        if (alive) setSvg(clean);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isSvg, url]);

  if (isSvg) {
    return svg ? (
      <Figure svg={svg} label={alt} maxWidth={720} framed className={className} />
    ) : (
      <div aria-label={alt} role="img" className={cn("aspect-[3/1] w-full rounded-md border border-hairline", className)} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- content crops of unknown size
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={cn("h-auto w-full max-w-[720px] rounded-md border border-hairline", className)}
    />
  );
}
