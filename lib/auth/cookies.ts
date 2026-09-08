import { AUTH_COOKIE_NAME, FALLBACK_SESSION_COOKIE_NAME } from "./middleware";

export function getClientAuthToken(): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(AUTH_COOKIE_NAME);
      if (stored) return stored;
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${AUTH_COOKIE_NAME}=`)) {
      return decodeURIComponent(cookie.substring(AUTH_COOKIE_NAME.length + 1));
    }
    if (cookie.startsWith(`${FALLBACK_SESSION_COOKIE_NAME}=`)) {
      return decodeURIComponent(
        cookie.substring(FALLBACK_SESSION_COOKIE_NAME.length + 1),
      );
    }
  }
  return null;
}

export function setClientAuthToken(token: string, days: number = 7): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(AUTH_COOKIE_NAME, token);
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof document === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

export function removeClientAuthToken(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(AUTH_COOKIE_NAME);
      window.localStorage.removeItem("token");
      window.localStorage.removeItem(FALLBACK_SESSION_COOKIE_NAME);
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof document === "undefined") return;

  document.cookie = `${AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  document.cookie = `${FALLBACK_SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function syncSessionToCookies(token: string | null | undefined): void {
  if (token && token.trim().length > 0) {
    setClientAuthToken(token);
  } else {
    removeClientAuthToken();
  }
}

