import { Monogram } from "./monogram";

/**
 * Bottom-margin convention: drafting reference bottom-left (mono), monogram bottom-right.
 * Only on Today and results screens (spec §4). Never inside exam routes.
 */
export function SignOff({ reference }: { reference?: string }) {
  return (
    <footer className="mt-16 flex items-end justify-between gap-4 border-t border-hairline pt-4">
      <p className="font-mono text-label uppercase text-mute">{reference ?? "pencil-down"}</p>
      <Monogram size={40} className="text-fg" />
    </footer>
  );
}
