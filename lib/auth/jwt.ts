/**
 * Lightweight JWT parsing and validation utilities for client and middleware
 */

export interface DecodedJwt {
  sub?: string;
  iss?: string;
  email?: string;
  name?: string;
  display_name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decodes the payload portion of a standard 3-part JWT without external dependencies.
 */
export function parseJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    
    // Support browser atob and Node Buffer
    let jsonPayload: string;
    if (typeof atob === "function") {
      jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
    } else {
      jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    }

    return JSON.parse(jsonPayload) as DecodedJwt;
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT contains an exp claim and is expired.
 */
export function isJwtExpired(token: string): boolean {
  const decoded = parseJwt(token);
  if (!decoded || typeof decoded.exp !== "number") return false;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Generates a valid synthetic JWT for local development, testing, and mock sessions.
 */
export function createSyntheticJwt(
  payload: Record<string, unknown>,
  expiresInSeconds: number = 7 * 86400,
): string {
  const header = { alg: "RS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload = {
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
    ...payload,
  };

  const encodeBase64Url = (obj: unknown) => {
    let base64: string;
    if (typeof btoa === "function") {
      base64 = btoa(JSON.stringify(obj));
    } else {
      base64 = Buffer.from(JSON.stringify(obj)).toString("base64");
    }
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url(fullPayload);
  const syntheticSignature = "synthetic_jwt_signature";

  return `${encodedHeader}.${encodedPayload}.${syntheticSignature}`;
}
