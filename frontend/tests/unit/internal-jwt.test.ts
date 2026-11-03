import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { AUDIENCE, TTL_SECONDS, mintInternalToken } from "../../src/lib/server/internal-jwt";

describe("mintInternalToken", () => {
  const token = mintInternalToken("user_abc", "s3cret", 1_000);
  const [h, p, s] = token.split(".");

  it("is a signed HS256 JWT FastAPI can verify", () => {
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(s).toBe(createHmac("sha256", "s3cret").update(`${h}.${p}`).digest("base64url"));
  });

  it("carries sub, aud and a 60 second expiry", () => {
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toEqual({
      sub: "user_abc",
      aud: AUDIENCE,
      iat: 1_000,
      exp: 1_000 + TTL_SECONDS,
    });
    expect(TTL_SECONDS).toBe(60);
  });

  it("refuses to sign without a secret", () => {
    expect(() => mintInternalToken("user_abc", "")).toThrow();
  });
});
