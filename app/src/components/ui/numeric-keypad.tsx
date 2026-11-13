"use client";

import { Backspace } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "-" | "back" | "clear";

/** Apply one key to the current entry. '-' toggles the sign; one '.' at most. */
export function applyKey(value: string, key: Key, maxLength = 10): string {
  if (key === "clear") return "";
  if (key === "back") return value.slice(0, -1);
  if (key === "-") return value.startsWith("-") ? value.slice(1) : `-${value}`;
  const digits = value.replace("-", "");
  if (digits.length >= maxLength) return value;
  if (key === ".") {
    if (value.includes(".")) return value;
    return digits === "" ? `${value}0.` : `${value}.`;
  }
  // No leading zeros: "0" then "5" → "5".
  if (digits === "0") return `${value.slice(0, -1)}${key}`;
  return `${value}${key}`;
}

const KEY_FROM_EVENT: Record<string, Key> = {
  Backspace: "back",
  Delete: "clear",
  Escape: "clear",
  ".": ".",
  ",": ".",
  "-": "-",
};

function KeyButton({
  k,
  onPress,
  label,
  children,
  className,
}: {
  k: Key;
  onPress: (k: Key) => void;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onPress(k)}
      className={cn(
        "flex min-h-14 select-none items-center justify-center rounded-sm border border-hairline font-mono text-heading",
        "transition-[background-color,border-color,transform] duration-(--dur-instant) ease-measured",
        "hover:border-fg active:translate-y-px active:bg-tint",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * On-screen keypad for NAT answers. Controlled: `value` is the raw entry string.
 * `captureKeyboard` also takes physical digits, '.', '-', Backspace, Esc while mounted.
 * Layout: 3×4 digit block, backspace and clear as tall keys on the right.
 */
export function NumericKeypad({
  value,
  onValueChange,
  maxLength = 10,
  allowNegative = true,
  allowDecimal = true,
  captureKeyboard = false,
  unit,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  maxLength?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  captureKeyboard?: boolean;
  /** Unit printed after the readout, e.g. "cm". */
  unit?: string;
  className?: string;
}) {
  const latest = useRef({ value, onValueChange, maxLength, allowNegative, allowDecimal });
  useEffect(() => {
    latest.current = { value, onValueChange, maxLength, allowNegative, allowDecimal };
  });

  const press = useCallback((k: Key) => {
    const { value: v, onValueChange: set, maxLength: max, allowNegative: neg, allowDecimal: dec } = latest.current;
    if (k === "-" && !neg) return;
    if (k === "." && !dec) return;
    set(applyKey(v, k, max));
  }, []);

  useEffect(() => {
    if (!captureKeyboard) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const k: Key | undefined = /^[0-9]$/.test(e.key) ? (e.key as Key) : KEY_FROM_EVENT[e.key];
      if (!k) return;
      e.preventDefault();
      press(k);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureKeyboard, press]);

  const empty = value === "";

  return (
    <div className={cn("flex w-full max-w-xs flex-col gap-3", className)}>
      <output
        aria-live="polite"
        aria-label="Answer"
        className="flex min-h-16 items-baseline justify-end gap-2 rounded-md border border-hairline px-4 py-3 font-mono"
      >
        <span className={cn("text-title tabular", empty ? "text-mute" : "text-fg")}>{empty ? "0" : value}</span>
        {unit && <span className="text-small text-mute">{unit}</span>}
      </output>
      <div className="grid grid-cols-4 grid-rows-4 gap-2">
        {/* Backspace and Clear are placed explicitly in column 4; digits auto-flow into columns 1–3. */}
        {(["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const).map((d) => (
          <KeyButton key={d} k={d} onPress={press}>
            {d}
          </KeyButton>
        ))}
        <KeyButton k="-" onPress={press} label="Toggle minus" className={cn(!allowNegative && "invisible")}>
          ±
        </KeyButton>
        <KeyButton k="0" onPress={press}>
          0
        </KeyButton>
        <KeyButton k="." onPress={press} label="Decimal point" className={cn(!allowDecimal && "invisible")}>
          .
        </KeyButton>
        <KeyButton k="back" onPress={press} label="Backspace" className="col-start-4 row-span-2 row-start-1">
          <Backspace size={24} weight="duotone" />
        </KeyButton>
        <KeyButton
          k="clear"
          onPress={press}
          label="Clear"
          className="col-start-4 row-span-2 row-start-3 text-mute"
        >
          <span className="font-body text-small font-medium">Clear</span>
        </KeyButton>
      </div>
    </div>
  );
}
