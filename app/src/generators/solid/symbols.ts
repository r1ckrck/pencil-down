// Face marks for cube-net questions, drawn in a local unit square [-0.5, 0.5]², y down, "up" = -y.
// SYMMETRIC marks look the same after any quarter turn; ORIENTED marks show which way they face.
import { W_EDGE, stroke } from "./svg";

const F = `fill="currentColor"`;
const S = stroke(W_EDGE);

export const SYMBOLS: Record<string, string> = {
  disc: `<circle r="0.2" ${F}/>`,
  ring: `<circle r="0.22" ${S}/>`,
  plus: `<path d="M-0.06 -0.26h0.12v0.2h0.2v0.12h-0.2v0.2h-0.12v-0.2h-0.2v-0.12h0.2Z" ${F}/>`,
  cross: `<path d="M-0.2 -0.2L0.2 0.2M0.2 -0.2L-0.2 0.2" ${stroke(2.4)}/>`,
  square: `<rect x="-0.2" y="-0.2" width="0.4" height="0.4" ${S}/>`,
  diamond: `<path d="M0 -0.26L0.26 0L0 0.26L-0.26 0Z" ${F}/>`,
  dots: `<circle cx="-0.14" cy="-0.14" r="0.07" ${F}/><circle cx="0.14" cy="-0.14" r="0.07" ${F}/><circle cx="-0.14" cy="0.14" r="0.07" ${F}/><circle cx="0.14" cy="0.14" r="0.07" ${F}/>`,
  // oriented
  arrow: `<path d="M0 -0.3L0.2 -0.06H0.07V0.28H-0.07V-0.06H-0.2Z" ${F}/>`,
  tri: `<path d="M0 -0.24L0.24 0.2H-0.24Z" ${F}/>`,
  half: `<rect x="-0.22" y="-0.22" width="0.44" height="0.44" ${S}/><path d="M-0.22 -0.22h0.44v0.22h-0.44Z" ${F}/>`,
  tee: `<path d="M-0.24 -0.24h0.48v0.12h-0.18v0.36h-0.12v-0.36h-0.18Z" ${F}/>`,
};

export const SYMMETRIC = ["disc", "ring", "plus", "cross", "square", "diamond", "dots"];
export const ORIENTED = ["arrow", "tri", "half", "tee"];
export const isOriented = (s: string) => ORIENTED.includes(s);
