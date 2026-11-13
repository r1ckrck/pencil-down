"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MagnifyingGlassPlus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Figure } from "@/components/ui/figure";
import { RoleLabel } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import type { QuestionPayload } from "./types";

/*
 * Scanned question images are white paper. In light mode multiply lets the white drop into the
 * cream ground; in dark mode the scan stays as a white sheet (inverting would falsify shading).
 */
const SCAN_BLEND =
  "mix-blend-multiply [:root[data-theme=dark]_&]:mix-blend-normal " +
  "[@media(prefers-color-scheme:dark)]:[:root:not([data-theme=light])_&]:mix-blend-normal";

/**
 * Full-screen zoom for a real question scan: natural pixel width, scrolls both ways.
 * Part A-local because the shared Dialog is a small centred panel.
 */
function ScanZoom({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Zoom question image"
          className="group relative block w-full cursor-zoom-in rounded-md text-left"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static scan, sized by its own dimensions */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={cn("block h-auto w-full select-none", SCAN_BLEND)}
            draggable={false}
          />
          <span
            aria-hidden
            className="absolute right-2 bottom-2 inline-flex size-touch items-center justify-center rounded-sm border border-hairline bg-bg text-mute opacity-80 transition-opacity group-hover:opacity-100"
          >
            <MagnifyingGlassPlus size={20} weight="duotone" />
          </span>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg animate-[pd-fade-in_var(--dur-base)_var(--ease-out)]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col outline-none animate-[pd-fade-in_var(--dur-base)_var(--ease-out)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-2">
            <DialogPrimitive.Title className="font-mono text-label uppercase text-mute">{alt}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close zoom"
              className="inline-flex size-touch items-center justify-center rounded-sm text-mute hover:bg-tint hover:text-fg"
            >
              <X size={20} weight="duotone" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Close asChild>
            <div className="flex-1 cursor-zoom-out overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- natural-size zoom of a static scan */}
              <img
                src={src}
                alt=""
                width={width}
                height={height}
                style={{ width, maxWidth: "none" }}
                className={cn("mx-auto block h-auto", SCAN_BLEND)}
              />
            </div>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * The question itself, the hero of the exam screen.
 * Real: the scan (stem and option visuals) at full column width, tap to zoom.
 * Generated: stem in the lead size, figure large (≥ 360 px on laptop, full width on phone).
 */
export function QuestionView({
  question,
  animated = false,
  compact = false,
}: {
  question: QuestionPayload;
  /** Past papers: the original used an animation; we show its still. */
  animated?: boolean;
  /** Results review: smaller figure. */
  compact?: boolean;
}) {
  if (question.source === "real") {
    return (
      <div className="flex flex-col gap-3" style={{ maxWidth: compact ? 720 : question.imageWidth }}>
        <ScanZoom src={question.image} alt={question.label} width={question.imageWidth} height={question.imageHeight} />
        {animated && <RoleLabel>This question was animated in the original paper.</RoleLabel>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-lead text-fg">{question.stem}</p>
      <Figure
        svg={question.figure}
        label={`Figure for ${question.label}`}
        maxWidth={compact ? 420 : 640}
        className={compact ? "min-w-0" : "min-w-0 md:min-w-[360px]"}
      />
    </div>
  );
}
