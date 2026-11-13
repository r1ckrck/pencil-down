import type { Db } from "../db/db";
import type { Format } from "../content/types";
import { type Mode, type Switches, PRESETS, defaultMode, isMode } from "./modes";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  budgets: Record<Format, number>; // seconds per question
  custom: Switches; // Custom mode switches
  lastMode: Mode; // pre-selected on every start screen
  theme: Theme;
}

export const DEFAULT_BUDGETS: Record<Format, number> = { MCQ: 60, MSQ: 90, NAT: 120 };

function raw(db: Db): Record<string, unknown> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export function getSettings(db: Db): Settings {
  const r = raw(db);
  const budgets = { ...DEFAULT_BUDGETS, ...((r.budgets as Partial<Record<Format, number>>) ?? {}) };
  return {
    budgets,
    custom: { ...PRESETS.hard, ...((r.custom as Partial<Switches>) ?? {}) },
    lastMode: defaultMode(r.lastMode),
    theme: (["system", "light", "dark"] as Theme[]).includes(r.theme as Theme) ? (r.theme as Theme) : "system",
  };
}

function put(db: Db, key: string, value: unknown) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
    key,
    JSON.stringify(value),
  );
}

// Validates a partial update; throws with a readable message on bad input.
export function updateSettings(db: Db, patch: Record<string, unknown>): Settings {
  const current = getSettings(db);
  if (patch.budgets !== undefined) {
    const b = patch.budgets as Record<string, unknown>;
    const next = { ...current.budgets };
    for (const f of ["MCQ", "MSQ", "NAT"] as Format[]) {
      if (b[f] === undefined) continue;
      const v = b[f];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 10 || v > 600) throw new Error(`budgets.${f} must be 10–600 s`);
      next[f] = v;
    }
    put(db, "budgets", next);
  }
  if (patch.custom !== undefined) {
    const c = patch.custom as Record<string, unknown>;
    const next = { ...current.custom };
    for (const k of Object.keys(next) as (keyof Switches)[]) {
      if (c[k] === undefined) continue;
      if (typeof c[k] !== "boolean") throw new Error(`custom.${k} must be boolean`);
      next[k] = c[k] as boolean;
    }
    put(db, "custom", next);
  }
  if (patch.lastMode !== undefined) {
    if (!isMode(patch.lastMode)) throw new Error("lastMode must be easy | hard | custom");
    put(db, "lastMode", patch.lastMode);
  }
  if (patch.theme !== undefined) {
    if (!["system", "light", "dark"].includes(patch.theme as string)) throw new Error("theme must be system | light | dark");
    put(db, "theme", patch.theme);
  }
  return getSettings(db);
}
