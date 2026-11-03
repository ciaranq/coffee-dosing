import { describe, expect, it } from "bun:test";
import { isCreatedLog, pickBackendOrigin } from "../../src/lib/server/backend";

describe("pickBackendOrigin", () => {
  it("prefers an explicit BACKEND_ORIGIN and trims a trailing slash", () => {
    expect(pickBackendOrigin({ BACKEND_ORIGIN: "https://coffee-dosing.vercel.app/", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://coffee-dosing.vercel.app",
    );
  });

  it("in production uses the public production domain, not the protected per-deployment URL", () => {
    expect(
      pickBackendOrigin({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "coffee-dosing.vercel.app",
        VERCEL_URL: "coffee-dosing-l062pogf6-organicseo.vercel.app",
      }),
    ).toBe("https://coffee-dosing.vercel.app");
  });

  it("falls back to the deployment URL on previews", () => {
    expect(pickBackendOrigin({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "p.vercel.app", VERCEL_URL: "d.vercel.app" })).toBe(
      "https://d.vercel.app",
    );
  });

  it("returns null when nothing is configured", () => {
    expect(pickBackendOrigin({})).toBe(null);
  });
});

describe("isCreatedLog", () => {
  const ok = { status: 201, contentType: "application/json", body: { id: "7b1f", ratio: 2 } };

  it("accepts a real 201 JSON log with an id", () => {
    expect(isCreatedLog(ok.status, ok.contentType, ok.body)).toBe(true);
    expect(isCreatedLog(201, "application/json; charset=utf-8", ok.body)).toBe(true);
  });

  it("rejects a 200 HTML page such as Vercel's login redirect target", () => {
    expect(isCreatedLog(200, "text/html; charset=utf-8", null)).toBe(false);
  });

  it("rejects redirects, errors and bodies without an id", () => {
    expect(isCreatedLog(302, "text/html", null)).toBe(false);
    expect(isCreatedLog(401, "application/json", { detail: "invalid token" })).toBe(false);
    expect(isCreatedLog(201, "application/json", {})).toBe(false);
    expect(isCreatedLog(201, "application/json", null)).toBe(false);
    expect(isCreatedLog(201, null, { id: "x" })).toBe(false);
  });
});
