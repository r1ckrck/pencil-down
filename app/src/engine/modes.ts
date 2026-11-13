// Difficulty modes (spec §5.0): Easy / Hard presets, or Custom from Settings.
export type Mode = "easy" | "hard" | "custom";
export const MODES: Mode[] = ["easy", "hard", "custom"];

export interface Switches {
  questionTimer: boolean; // Part A per-question countdown visible
  forcedSkip: boolean; // Part A: at budget zero, save as-is and move to the revisit queue
  phaseTimer: boolean; // Part B phase clock visible
  questionHiding: boolean; // Part B prompt visible only in its windows
}

export const PRESETS: Record<"easy" | "hard", Switches> = {
  easy: { questionTimer: true, forcedSkip: false, phaseTimer: true, questionHiding: false },
  hard: { questionTimer: false, forcedSkip: true, phaseTimer: true, questionHiding: true },
};

export const DEFAULT_MODE: Mode = "hard";

export function switchesFor(mode: Mode, custom: Switches): Switches {
  return mode === "custom" ? { ...custom } : { ...PRESETS[mode] };
}

export function isMode(v: unknown): v is Mode {
  return typeof v === "string" && (MODES as string[]).includes(v);
}

// Start-screen pre-selection: the last mode used, Hard on first run.
export function defaultMode(lastUsed: unknown): Mode {
  return isMode(lastUsed) ? lastUsed : DEFAULT_MODE;
}
