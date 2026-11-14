import { cn } from "@/lib/cn";
import { marks } from "./labels";

/**
 * Score on a drafted scale from 0 to the paper's maximum, with the cutoff band shaded and the
 * target ticked (mocks and full exams, out of 150), or that year's cutoff ticked (past papers);
 * drills and revisits show the plain scale. Ink only: the score is the
 * solid marker; references are hairline and mute.
 */
export function ScoreScale({
  score,
  max,
  band: bandIn,
  target,
  cutoff,
}: {
  score: number;
  max: number;
  band: { low: number; high: number } | null;
  target: number | null;
  cutoff: number | null;
}) {
  const lo = Math.min(0, Math.floor(score));
  const span = Math.max(1, max - lo);
  const at = (v: number) => `${((Math.min(max, Math.max(lo, v)) - lo) / span) * 100}%`;
  // A reference beyond the scale is not drawn: clamped to the end it would read as a real mark.
  const inRange = (v: number) => v >= lo && v <= max;
  const ticks: { v: number; label: string }[] = [];
  if (target !== null && inRange(target)) ticks.push({ v: target, label: `target ${target}` });
  if (cutoff !== null && inRange(cutoff)) ticks.push({ v: cutoff, label: `cutoff ${cutoff}` });
  const band = bandIn && inRange(bandIn.low) && inRange(bandIn.high) ? bandIn : null;

  return (
    <div className="w-full select-none" role="img" aria-label={`Score ${marks(score)} of ${max}`}>
      <div className="relative h-16">
        {/* band */}
        {band && (
          <span
            className="absolute top-3 bottom-3 border-x border-hairline bg-tint"
            style={{ left: at(band.low), width: `calc(${at(band.high)} - ${at(band.low)})` }}
          />
        )}
        {/* scale line with end ticks */}
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline" />
        <span className="absolute top-5 bottom-5 left-0 w-px bg-fg" />
        <span className="absolute top-5 right-0 bottom-5 w-px bg-fg" />
        {/* references */}
        {ticks.map((t) => (
          <span key={t.label} className="absolute top-2 bottom-2 w-px border-l border-dashed border-fg" style={{ left: at(t.v) }} />
        ))}
        {/* score */}
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-fg"
          style={{ left: at(score) }}
        />
      </div>
      <div className="relative h-10 font-mono text-label uppercase text-mute">
        <span className="absolute left-0">{lo}</span>
        <span className="absolute right-0">{max}</span>
        {band && (
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `calc((${at(band.low)} + ${at(band.high)}) / 2)` }}
          >
            band {band.low}–{band.high}
          </span>
        )}
        {ticks.map((t) => (
          <span
            key={t.label}
            className={cn("absolute -translate-x-1/2 whitespace-nowrap text-fg", band ? "top-5" : "top-0")}
            style={{ left: at(t.v) }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
