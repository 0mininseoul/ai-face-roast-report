import { describe, expect, it } from "vitest";
import { validateAdminBasicAuth } from "@/lib/admin/basicAuth";

describe("validateAdminBasicAuth", () => {
  const env = {
    ADMIN_DATA_USERNAME: "admin",
    ADMIN_DATA_PASSWORD: "secret:with-colon",
  };

  it("fails closed when admin credentials are not configured", () => {
    expect(validateAdminBasicAuth(authHeader("admin", "secret"), {})).toEqual({ ok: false, configured: false });
  });

  it("rejects missing or malformed authorization headers", () => {
    expect(validateAdminBasicAuth(null, env)).toEqual({ ok: false, configured: true });
    expect(validateAdminBasicAuth("Bearer token", env)).toEqual({ ok: false, configured: true });
    expect(validateAdminBasicAuth("Basic not-base64", env)).toEqual({ ok: false, configured: true });
  });

  it("rejects wrong credentials", () => {
    expect(validateAdminBasicAuth(authHeader("admin", "wrong"), env)).toEqual({ ok: false, configured: true });
    expect(validateAdminBasicAuth(authHeader("other", "secret:with-colon"), env)).toEqual({ ok: false, configured: true });
  });

  it("accepts the configured credentials", () => {
    expect(validateAdminBasicAuth(authHeader("admin", "secret:with-colon"), env)).toEqual({ ok: true, configured: true });
  });
});

function authHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
