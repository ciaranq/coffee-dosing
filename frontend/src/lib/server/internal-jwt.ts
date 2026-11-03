import { createHmac } from "node:crypto";

// Short-lived HS256 token that Next.js mints for FastAPI after it has verified the user's session.
// Contract: docs/contract/api-contract.md. Never sent to the browser.

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

export const AUDIENCE = "dialin-api";
export const TTL_SECONDS = 60;

export function mintInternalToken(subject: string, secret: string, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  if (!secret) throw new Error("INTERNAL_JWT_SECRET is not set");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: subject, aud: AUDIENCE, iat: nowSeconds, exp: nowSeconds + TTL_SECONDS }));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
