import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isJwtExpired } from "./jwt";

export const AUTH_COOKIE_NAME = "auth_token";
export const FALLBACK_SESSION_COOKIE_NAME = "session";

export const PROTECTED_ROUTES = [
  '/',
  'profile',
  "/me",
  "/projects",
  "/sessions",
  "/teams",
  "/settings",
];

export const AUTH_ROUTES = ["/auth/login", "/auth/register"];

export const EXEMPT_ROUTES = ["/auth/callback"];

export const PUBLIC_ROUTES = [
  "/home",
  "/about",
  "/pricing",
  "/team",
  "/data-privacy",
  "/terms-and-conditions",
  "/contacts",
  "/invitations",
];

export function isRouteMatched(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isInvitationAcceptRoute(pathname: string): boolean {
  return /^\/invitations\/[^/]+\/accept\/?$/.test(pathname);
}

export function handleRouteProtection(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (isRouteMatched(pathname, EXEMPT_ROUTES)) {
    return NextResponse.next();
  }

  const authToken =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get(FALLBACK_SESSION_COOKIE_NAME)?.value;
  const isExpired = authToken ? isJwtExpired(authToken) : false;
  const isAuthenticated = Boolean(
    authToken && authToken.trim().length > 0 && !isExpired,
  );

  const isProtected =
    isRouteMatched(pathname, PROTECTED_ROUTES) ||
    isInvitationAcceptRoute(pathname);
  const isAuthPage = isRouteMatched(pathname, AUTH_ROUTES);

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");

    const safeRedirect =
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//")
        ? redirectParam
        : "/";

    const targetUrl = new URL(safeRedirect, request.url);
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}
