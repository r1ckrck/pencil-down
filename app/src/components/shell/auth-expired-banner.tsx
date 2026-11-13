"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AUTH_EXPIRED_EVENT } from "@/lib/session-fetch";

/**
 * Shown when an API call meets an expired login. Everything already answered is saved on the server and the clock keeps
 * running; reloading sends her through the login page and straight back to the same screen.
 */
export function AuthExpiredBanner() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const on = () => setExpired(true);
    window.addEventListener(AUTH_EXPIRED_EVENT, on);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, on);
  }, []);

  if (!expired) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-bg px-4 py-4 md:px-8"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
        <p className="text-body">
          Your login expired. Answers so far are saved and the clock is still running.
        </p>
        <Button onClick={() => window.location.reload()}>Log in again</Button>
      </div>
    </div>
  );
}
