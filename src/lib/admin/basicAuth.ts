export interface AdminAuthResult {
  ok: boolean;
  configured: boolean;
}

type AdminAuthEnv = Record<string, string | undefined>;

export function validateAdminBasicAuth(
  authorization: string | null,
  env: AdminAuthEnv = process.env,
): AdminAuthResult {
  const expectedUsername = env.ADMIN_DATA_USERNAME;
  const expectedPassword = env.ADMIN_DATA_PASSWORD;
  if (!expectedUsername || !expectedPassword) return { ok: false, configured: false };

  const credentials = parseBasicAuth(authorization);
  if (!credentials) return { ok: false, configured: true };

  return {
    ok: secureCompare(credentials.username, expectedUsername) && secureCompare(credentials.password, expectedPassword),
    configured: true,
  };
}

function parseBasicAuth(authorization: string | null): { username: string; password: string } | null {
  if (!authorization?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(authorization.slice("Basic ".length).trim());
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function secureCompare(actual: string, expected: string): boolean {
  let diff = actual.length ^ expected.length;
  const maxLength = Math.max(actual.length, expected.length);
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return diff === 0;
}
