"use client";

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./button";

const overlay =
  "fixed inset-0 z-50 bg-bg/80 animate-[pd-fade-in_var(--dur-base)_var(--ease-out)]";
const content =
  "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 " +
  "rounded-lg border border-hairline bg-bg p-6 text-fg outline-none " +
  "animate-[pd-rise-in_var(--dur-base)_var(--ease-out)]";

/** General modal: a panel over a dimmed page. Esc and the close control dismiss it. */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content className={content} {...(description ? {} : { "aria-describedby": undefined })}>
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-heading font-medium">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mt-2 -mr-2 inline-flex size-touch items-center justify-center rounded-sm text-mute hover:bg-tint hover:text-fg"
            >
              <X size={20} weight="duotone" />
            </DialogPrimitive.Close>
          </div>
          {description && (
            <DialogPrimitive.Description className="mt-2 text-small text-mute">
              {description}
            </DialogPrimitive.Description>
          )}
          {children && <div className="mt-6">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * One-step confirm for irreversible actions (Quit session).
 * Alert dialog semantics: focus starts on Cancel, outside clicks don't dismiss.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  /** Extra consequence detail, e.g. "12 unanswered will be recorded as skipped". */
  children?: ReactNode;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlay} />
        <AlertDialogPrimitive.Content className={content}>
          <AlertDialogPrimitive.Title className="text-heading font-medium">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-small text-mute">
            {description}
          </AlertDialogPrimitive.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-8 flex flex-wrap justify-end gap-2">
            <AlertDialogPrimitive.Cancel className={buttonClasses({ variant: "quiet" })}>
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={onConfirm}
              className={cn(buttonClasses({ variant: tone === "danger" ? "danger" : "primary" }))}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
