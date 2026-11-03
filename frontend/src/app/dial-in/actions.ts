"use server";

import { auth } from "@clerk/nextjs/server";
import { computeShot, MAX_GRAMS } from "@/lib/math";
import { mintInternalToken } from "@/lib/server/internal-jwt";

export interface SubmitPayload {
  client_id: string;
  portafilter_empty_g: number;
  portafilter_dry_g: number;
  cup_empty_g: number;
  cup_full_g: number;
  portafilter_wet_g: number | null;
  shot_time_s: number | null;
  taste: "sour" | "balanced" | "bitter" | null;
  grind_external: number | null;
  burr_internal: number | null;
}

export type SubmitResult =
  | { ok: true; persisted: true }
  /** Valid shot, but the user is signed out or the backend is not configured: the client keeps it on this device. */
  | { ok: true; persisted: false; reason: "signed-out" | "backend-not-configured" }
  | { ok: false; error: string };

/**
 * Who is signed in? The Clerk user id from the verified session, or null when signed out.
 * Deliberately no environment-variable bypass: an unverified subject must never reach the API.
 */
async function getAuthSubject(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

function backendOrigin(): string | null {
  if (process.env.BACKEND_ORIGIN) return process.env.BACKEND_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_GRAMS;

export async function submitShot(payload: SubmitPayload): Promise<SubmitResult> {
  // Never trust the browser: re-run the same checks the API and database enforce.
  if (![payload.portafilter_empty_g, payload.portafilter_dry_g, payload.cup_empty_g, payload.cup_full_g].every(finite)) {
    return { ok: false, error: "Weights must be numbers between 0 and 5000 g." };
  }
  const shot = computeShot({
    pfEmpty: payload.portafilter_empty_g,
    pfDry: payload.portafilter_dry_g,
    cupEmpty: payload.cup_empty_g,
    cupFull: payload.cup_full_g,
    pfWet: payload.portafilter_wet_g,
  });
  if (!shot.ok) return { ok: false, error: shot.errors[0] };

  const subject = await getAuthSubject();
  if (!subject) return { ok: true, persisted: false, reason: "signed-out" };

  const origin = backendOrigin();
  const secret = process.env.INTERNAL_JWT_SECRET;
  if (!origin || !secret) return { ok: true, persisted: false, reason: "backend-not-configured" };

  try {
    const response = await fetch(`${origin}/api/logs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${mintInternalToken(subject, secret)}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000), // stay inside the 10 s function limit
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: `Could not save the shot (${response.status}).` };
    return { ok: true, persisted: true };
  } catch {
    return { ok: false, error: "Could not reach the server. Your shot is still on this device." };
  }
}
