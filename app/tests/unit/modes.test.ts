import { describe, expect, it } from "vitest";
import { PRESETS, type Switches, defaultMode, switchesFor } from "@/engine/modes";
import { getSettings, updateSettings } from "@/engine/settings";
import { createSession, getSession, quit } from "@/engine/session";
import { makeCtx } from "./fixtures";

describe("difficulty modes (spec §5.0)", () => {
  it("Easy and Hard set exactly the four switches", () => {
    expect(PRESETS.easy).toEqual({ questionTimer: true, forcedSkip: false, phaseTimer: true, questionHiding: false });
    expect(PRESETS.hard).toEqual({ questionTimer: false, forcedSkip: true, phaseTimer: true, questionHiding: true });
  });

  it("Custom passes every one of the 16 combinations through unchanged", () => {
    for (let mask = 0; mask < 16; mask++) {
      const sw: Switches = {
        questionTimer: !!(mask & 1),
        forcedSkip: !!(mask & 2),
        phaseTimer: !!(mask & 4),
        questionHiding: !!(mask & 8),
      };
      expect(switchesFor("custom", sw)).toEqual(sw);
      expect(switchesFor("easy", sw)).toEqual(PRESETS.easy);
      expect(switchesFor("hard", sw)).toEqual(PRESETS.hard);
    }
  });

  it("pre-selects the last mode used; Hard on first run", () => {
    expect(defaultMode(undefined)).toBe("hard");
    expect(defaultMode("nonsense")).toBe("hard");
    expect(defaultMode("easy")).toBe("easy");
    const ctx = makeCtx();
    expect(getSettings(ctx.db).lastMode).toBe("hard");
    const s = createSession(ctx, { kind: "drill", mode: "easy", n: 3 });
    expect(s.mode).toBe("easy");
    expect(s.config.switches).toEqual(PRESETS.easy);
    expect(getSettings(ctx.db).lastMode).toBe("easy");
    quit(ctx, s.id);
    // no mode given → last used
    const s2 = createSession(ctx, { kind: "drill", n: 3 });
    expect(getSession(ctx.db, s2.id).mode).toBe("easy");
  });

  it("custom session snapshots the Settings switches", () => {
    const ctx = makeCtx();
    const custom = { questionTimer: true, forcedSkip: true, phaseTimer: false, questionHiding: false };
    updateSettings(ctx.db, { custom });
    const s = createSession(ctx, { kind: "drill", mode: "custom", n: 2 });
    expect(s.config.switches).toEqual(custom);
  });

  it("settings validation", () => {
    const ctx = makeCtx();
    expect(() => updateSettings(ctx.db, { budgets: { MCQ: 5 } })).toThrow();
    expect(() => updateSettings(ctx.db, { lastMode: "medium" })).toThrow();
    expect(updateSettings(ctx.db, { budgets: { MCQ: 45 } }).budgets).toEqual({ MCQ: 45, MSQ: 90, NAT: 120 });
  });
});
