import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "quiet" | "danger";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-sm border font-body font-medium " +
  "transition-[background-color,border-color,color,transform] duration-(--dur-fast) ease-measured " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  // One per region: the action that moves her forward.
  primary: "border-fg bg-fg text-on-fg hover:bg-fg/88",
  // Everything else.
  quiet: "border-hairline bg-transparent text-fg hover:border-fg hover:bg-tint",
  // Destructive, irreversible: Quit, Clear history.
  danger: "border-bad/60 bg-transparent text-bad hover:border-bad hover:bg-bad/8",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-touch px-4 text-small",
  lg: "min-h-14 px-6 text-body",
};

/** Class string for anything that should look like a button (e.g. a next/link). */
export function buttonClasses({
  variant = "quiet",
  size = "md",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** Phosphor icon element, placed before the label. */
  icon?: ReactNode;
  /** Trailing mono hint, e.g. a keyboard shortcut or a count. */
  hint?: ReactNode;
};

export function Button({
  variant = "quiet",
  size = "md",
  block,
  icon,
  hint,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, block, className })} {...rest}>
      {icon && (
        <span aria-hidden className="-ml-1 inline-flex text-[1.25em]">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {hint && <span className="font-mono text-caption opacity-60">{hint}</span>}
    </button>
  );
}
