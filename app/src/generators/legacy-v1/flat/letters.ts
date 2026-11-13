// A minimal stroke alphabet (uppercase) on a 4 × 6 box, y down. Drawn as geometry, not text,
// so mirror images are exact and comparable by canonical form.
import type { Drawing, Pt } from "./svg";

const P = (...pts: number[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push([pts[i], pts[i + 1]]);
  return out;
};
const O = P(1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0);
const PB = P(0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3);

export const GLYPHS: Record<string, Pt[][]> = {
  A: [P(0, 6, 0, 1.5, 1, 0, 3, 0, 4, 1.5, 4, 6), P(0, 3.5, 4, 3.5)],
  B: [P(0, 0, 0, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3), P(0, 0, 2.5, 0, 3.5, 1, 3.5, 2, 2.5, 3)],
  C: [P(4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5)],
  D: [P(0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0)],
  E: [P(4, 0, 0, 0, 0, 6, 4, 6), P(0, 3, 3, 3)],
  F: [P(4, 0, 0, 0, 0, 6), P(0, 3, 3, 3)],
  G: [P(4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.5, 2.5, 3.5)],
  H: [P(0, 0, 0, 6), P(4, 0, 4, 6), P(0, 3, 4, 3)],
  I: [P(2, 0, 2, 6), P(1, 0, 3, 0), P(1, 6, 3, 6)],
  J: [P(4, 0, 4, 5, 3, 6, 1, 6, 0, 5, 0, 4)],
  K: [P(0, 0, 0, 6), P(4, 0, 0, 3.5), P(1.6, 2.1, 4, 6)],
  L: [P(0, 0, 0, 6, 4, 6)],
  M: [P(0, 6, 0, 0, 2, 3, 4, 0, 4, 6)],
  N: [P(0, 6, 0, 0, 4, 6, 4, 0)],
  O: [O],
  P: [PB],
  Q: [O, P(2.5, 4.5, 4, 6)],
  R: [PB, P(2, 3, 4, 6)],
  S: [P(4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5)],
  T: [P(0, 0, 4, 0), P(2, 0, 2, 6)],
  U: [P(0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0)],
  V: [P(0, 0, 2, 6, 4, 0)],
  W: [P(0, 0, 1, 6, 2, 2.5, 3, 6, 4, 0)],
  X: [P(0, 0, 4, 6), P(4, 0, 0, 6)],
  Y: [P(0, 0, 2, 3, 4, 0), P(2, 3, 2, 6)],
  Z: [P(0, 0, 4, 0, 0, 6, 4, 6)],
};

export const PITCH = 6.2; // letter advance

// Word laid out centred on the origin. `flipEach` mirrors each glyph in its own slot
// (h: left-right, v: upside down); `reverse` reverses the slot order.
export function wordDrawing(word: string, opts: { flipEach?: "h" | "v"; reverse?: boolean } = {}): Drawing {
  const letters = [...word];
  const total = (letters.length - 1) * PITCH + 4;
  const strokes: Pt[][] = [];
  letters.forEach((ch, i) => {
    const slot = opts.reverse ? letters.length - 1 - i : i;
    const x0 = slot * PITCH - total / 2;
    for (const s of GLYPHS[ch]) {
      strokes.push(
        s.map(([x, y]) => {
          const gx = opts.flipEach === "h" ? 4 - x : x;
          const gy = opts.flipEach === "v" ? 6 - y : y;
          return [x0 + gx, gy - 3];
        }),
      );
    }
  });
  return { strokes, fills: [], dots: [] };
}

// Words with at least two letters that change under a left-right flip, so mirror images are
// visibly different from the original.
export const WORDS = [
  "FORM", "GRID", "SKETCH", "PAPER", "BRUSH", "SCALE", "PLAN", "CRAFT", "LENS", "PRINT",
  "FRAME", "SPACE", "BLOCK", "CLAY", "PENCIL", "RULER", "CHAIR", "LAMP", "KITE", "FLAG",
  "DRUM", "BRICK", "SHADE", "CURVE", "GLYPH", "LOGO", "SERIF", "BENCH", "CLOCK", "JUG",
  "KNOB", "STRAP", "DESK", "FOLD", "SPRING", "LEVER", "GEAR", "ZIP", "RICKSHAW", "SARI",
];
