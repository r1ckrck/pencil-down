// fetch for API calls that must notice an expired login.
// Behind the auth gate, an expired login answers API calls with a redirect to the login page.
// With redirect: "manual" that arrives as an opaque redirect instead of a CORS failure, so it can be told apart from a network drop.

export const AUTH_EXPIRED_EVENT = "pencil:auth-expired";

export class AuthExpiredError extends Error {
  constructor() {
    super("login expired");
  }
}

export async function sessionFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { ...init, redirect: "manual" });
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    throw new AuthExpiredError();
  }
  return res;
}
