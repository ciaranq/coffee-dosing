// Helpers for the server action's call to the FastAPI backend (same Vercel project, under /api).

type Env = Record<string, string | undefined>;

/**
 * Where the server action should call the API. Per-deployment URLs (VERCEL_URL) sit behind Vercel's
 * deployment protection and answer with a login redirect, so production uses the public production domain.
 */
export function pickBackendOrigin(env: Env): string | null {
  if (env.BACKEND_ORIGIN) return env.BACKEND_ORIGIN.replace(/\/$/, "");
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return null;
}

/**
 * Did the API really create the log? Only a 201 JSON body carrying an id counts. A redirect, an HTML page
 * (for example a login screen) or an error must never be reported as "saved to your account".
 */
export function isCreatedLog(status: number, contentType: string | null, body: unknown): boolean {
  if (status !== 201 || !contentType?.toLowerCase().includes("application/json")) return false;
  return typeof body === "object" && body !== null && typeof (body as { id?: unknown }).id === "string";
}
