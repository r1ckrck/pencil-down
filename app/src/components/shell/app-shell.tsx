import { Suspense, type ReactNode } from "react";
import { ActiveRailNav, ActiveTabNav, RailNav, TabNav } from "./app-nav";

/**
 * Chrome for every non-exam route: left rail on laptop, bottom tab bar on phone.
 * usePathname may suspend under Cache Components on routes with unknown params,
 * so each nav renders inactive inside a Suspense fallback first.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[224px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-hairline px-4 py-6 md:flex">
        <div className="flex flex-col gap-8">
          <div className="px-3">
            <p className="text-body font-semibold tracking-[-0.01em]">Pencil Down</p>
            <p className="font-mono text-label uppercase text-mute">CEED · 17 Jan 2027</p>
          </div>
          <nav aria-label="Main">
            <Suspense fallback={<RailNav pathname={null} />}>
              <ActiveRailNav />
            </Suspense>
          </nav>
        </div>
        <p className="px-3 font-mono text-label uppercase text-mute">IIT Bombay · M.Des</p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(56px+env(safe-area-inset-bottom)+24px)] md:px-8 md:pt-12 md:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Suspense fallback={<TabNav pathname={null} />}>
          <ActiveTabNav />
        </Suspense>
      </nav>
    </div>
  );
}
