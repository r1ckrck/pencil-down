"use client";
import { sessionFetch } from "@/lib/session-fetch";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Metric } from "@/components/ui/stat";

type Due = { dueCount: number; newCount: number };

/** Today's review load and the way in. */
export function DuePanel() {
  const [due, setDue] = useState<Due | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    sessionFetch("/api/cards/due", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: Due) => live && setDue({ dueCount: d.dueCount, newCount: d.newCount }))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const total = due ? due.dueCount + due.newCount : 0;

  return (
    <Panel label="Review" index="01" aside="FSRS schedule">
      {failed ? (
        <p className="text-small text-mute">Could not load the review queue. Reload to try again.</p>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-8" aria-busy={!due}>
            <Metric value={due ? due.dueCount : "–"} label="due now" size="lg" />
            <Metric value={due ? due.newCount : "–"} label="new today" size="lg" tone="mute" />
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {due && total === 0 ? (
              <p className="text-small text-mute">Nothing due. Come back tomorrow, or browse below.</p>
            ) : (
              <Link
                href="/knowledge/review"
                aria-disabled={!due}
                className={buttonClasses({ variant: "primary", size: "lg", className: "w-full md:w-auto" })}
                data-testid="start-review"
              >
                Start review{due ? ` · ${total}` : ""}
              </Link>
            )}
            <p className="text-caption text-mute">Due cards first, then up to 20 new a day, asked-in-a-paper first.</p>
          </div>
        </div>
      )}
    </Panel>
  );
}
