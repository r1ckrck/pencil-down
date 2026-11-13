import { Cards, ListChecks, PencilSimpleLine } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { Eyebrow } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type HabitKey = "partA" | "partB" | "cards";

export interface HabitData {
  days: { date: string; isToday: boolean }[];
  rows: { key: HabitKey; label: string; done: boolean[] }[];
  doneToday: number;
  streak: number;
}

type IconProps = { size?: number; weight?: "fill"; className?: string; "aria-hidden"?: boolean };
const ICON: Record<HabitKey, ComponentType<IconProps>> = { partA: ListChecks, partB: PencilSimpleLine, cards: Cards };
const SHORT: Record<HabitKey, string> = { partA: "Part A", partB: "Part B", cards: "Cards" };

const weekday = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const dayNum = (date: string) => Number(date.slice(8, 10));
const longDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

/**
 * Positive-reinforcement tracker: habits down, days across. A done day shows the habit's filled icon;
 * an open day is an empty hairline square. Today's completed icons carry the screen's one accent.
 */
export function HabitTracker({ data }: { data: HabitData }) {
  const { days, rows, doneToday, streak } = data;
  return (
    <section aria-label="Habit tracker" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <Eyebrow>Habits · 7 days</Eyebrow>
        <p className="font-mono text-caption text-mute">
          {streak > 0 ? (
            <>
              <span className="text-fg">{streak}</span>-day streak
            </>
          ) : (
            "start a streak today"
          )}
          <span aria-hidden> · </span>
          <span className="text-fg">{doneToday}</span>/{rows.length} today
        </p>
      </div>

      <table className="-mx-1 border-separate border-spacing-1 sm:-mx-1.5 sm:border-spacing-1.5">
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Habit
            </th>
            {days.map((d) => (
              <th
                key={d.date}
                scope="col"
                className={cn("w-7 text-center font-mono text-caption font-normal sm:w-8", d.isToday ? "text-fg" : "text-mute")}
              >
                <span className="sr-only">{longDate(d.date)}</span>
                <span aria-hidden className="flex flex-col items-center leading-tight">
                  <span>{weekday(d.date)}</span>
                  <span>{dayNum(d.date)}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const Icon = ICON[r.key];
            return (
              <tr key={r.key}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left text-small font-normal text-fg sm:pr-3">
                  <span className="sm:hidden">{SHORT[r.key]}</span>
                  <span className="hidden sm:inline">{r.label}</span>
                </th>
                {r.done.map((done, i) => (
                  <td key={days[i].date} className="p-0">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-sm sm:size-8",
                        done ? "" : "border border-hairline",
                      )}
                    >
                      {done ? (
                        <Icon
                          size={24}
                          weight="fill"
                          aria-hidden
                          className={days[i].isToday ? "text-accent" : "text-fg"}
                        />
                      ) : null}
                      <span className="sr-only">{done ? "done" : "not yet"}</span>
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
