"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Settings-style on/off. The whole row is the 44px target.
 * Thumb is a rounded square (shape grammar), sliding mechanically.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-h-touch items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col py-2">
        <span className="text-body text-fg">{label}</span>
        {description && <span className="text-caption text-mute">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className="group relative inline-flex h-touch w-14 shrink-0 items-center justify-center disabled:opacity-40"
      >
        <span
          aria-hidden
          className={cn(
            "relative block h-6 w-11 rounded-sm border transition-colors duration-(--dur-fast) ease-measured",
            checked ? "border-fg bg-fg" : "border-hairline bg-transparent group-hover:border-fg",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] left-[3px] block size-4 rounded-xs transition-[transform,background-color] duration-(--dur-fast) ease-measured",
              checked ? "translate-x-5 bg-on-fg" : "translate-x-0 bg-mute",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/**
 * Two-state button (aria-pressed): mark for review, sure / unsure.
 * Shows its state in words as well as weight, so meaning never rests on fill alone.
 */
export function Toggle({
  pressed,
  onPressedChange,
  children,
  icon,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex min-h-touch select-none items-center gap-2 rounded-sm border px-3 text-small font-medium",
        "transition-colors duration-(--dur-fast) ease-measured disabled:opacity-40",
        pressed
          ? "border-fg bg-tint text-fg"
          : "border-hairline bg-transparent text-mute hover:border-fg hover:text-fg",
        className,
      )}
    >
      {icon && (
        <span aria-hidden className="inline-flex text-[1.25em]">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
