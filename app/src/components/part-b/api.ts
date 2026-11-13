// Thin fetch helpers for the session API. Errors carry status and the JSON body.

export class RequestError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === "string" ? body.error : `request failed (${status})`);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new RequestError(res.status, json);
  return json as T;
}

export async function getJSON<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { cache: "no-store" }));
}

export async function postJSON<T>(url: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  return parse<T>(await fetch(url, { method: "POST", body: form }));
}

/** Where a session's live screen lives, by kind. */
export function sessionHref(id: number, kind: string): string {
  if (kind === "full") return `/exam/${id}`;
  if (kind.startsWith("b-")) return `/part-b/${id}`;
  return `/part-a/${id}`;
}
