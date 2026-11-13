export type Kind = "mock" | "drill" | "revisit" | "past-paper" | "b-drill" | "b-mock" | "b-past-paper" | "full";
export const KINDS: Kind[] = ["mock", "drill", "revisit", "past-paper", "b-drill", "b-mock", "b-past-paper", "full"];

export const hasPartA = (k: Kind) => k === "mock" || k === "drill" || k === "revisit" || k === "past-paper" || k === "full";
export const hasPartB = (k: Kind) => k === "b-drill" || k === "b-mock" || k === "b-past-paper" || k === "full";
