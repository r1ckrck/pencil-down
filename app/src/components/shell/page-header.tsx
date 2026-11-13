import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/label";

/** Top of a screen: mono eyebrow, title in the body face (display is reserved), optional aside. */
export function PageHeader({
  eyebrow,
  index,
  title,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  index?: string;
  title: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 border-b border-hairline pb-6 md:mb-12">
      <div className="flex items-baseline justify-between gap-4">
        {eyebrow ? <Eyebrow index={index}>{eyebrow}</Eyebrow> : <span />}
        {aside && <div className="font-mono text-caption text-mute">{aside}</div>}
      </div>
      <h1 className="text-title font-semibold">{title}</h1>
      {children && <div className="max-w-2xl text-body text-mute">{children}</div>}
    </header>
  );
}
