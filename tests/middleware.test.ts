import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  handleRouteProtection,
  isRouteMatched,
  isInvitationAcceptRoute,
  AUTH_COOKIE_NAME,
  FALLBACK_SESSION_COOKIE_NAME,
  PROTECTED_ROUTES,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  EXEMPT_ROUTES,
} from "@/lib/auth/middleware";
import { proxy, middleware } from "@/proxy";

function createMockRequest(
  urlPath: string,
  cookies?: Record<string, string>,
): NextRequest {
  const normalizedPath = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  const url = `http://localhost:3000${normalizedPath}`;
  const request = new NextRequest(new Request(url));
  if (cookies) {
    for (const [key, value] of Object.entries(cookies)) {
      request.cookies.set(key, value);
    }
  }
  return request;
}

describe("Route Protection Middleware", () => {
  describe("isRouteMatched helper", () => {
    it("matches exact paths", () => {
      expect(isRouteMatched("/me", ["/me", "/projects"])).toBe(true);
      expect(isRouteMatched("/auth/login", ["/auth/login", "/auth/register"])).toBe(true);
    });

    it("matches sub-paths correctly", () => {
      expect(isRouteMatched("/me/settings", ["/me"])).toBe(true);
      expect(isRouteMatched("/projects/team-1/pitch", ["/projects"])).toBe(true);
      expect(isRouteMatched("/teams/team-1/members", ["/teams"])).toBe(true);
      expect(isRouteMatched("/sessions/session-99/qa", ["/sessions"])).toBe(true);
    });

    it("does not match unrelated paths", () => {
      expect(isRouteMatched("/about", ["/me", "/projects"])).toBe(false);
      expect(isRouteMatched("/me-extended", ["/me"])).toBe(false);
      expect(isRouteMatched("/team", ["/teams"])).toBe(false);
    });
  });

  describe("isInvitationAcceptRoute helper", () => {
    it("identifies invitation accept routes", () => {
      expect(isInvitationAcceptRoute("/invitations/token123/accept")).toBe(true);
      expect(isInvitationAcceptRoute("/invitations/token123/accept/")).toBe(true);
    });

    it("does not match public invitation preview routes", () => {
      expect(isInvitationAcceptRoute("/invitations/token123")).toBe(false);
      expect(isInvitationAcceptRoute("/invitations")).toBe(false);
    });
  });

  describe("Protected Routes", () => {
    it.each(PROTECTED_ROUTES.filter((route) => route.startsWith("/")))(
      "redirects unauthenticated users from protected base route '%s' to /login",
      (route) => {
        const request = createMockRequest(route);
        const response = handleRouteProtection(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toContain("/login");
        expect(location).toContain(
          `redirect=${encodeURIComponent(route.startsWith("/") ? route : `/${route}`)}`,
        );
      },
    );

    it("preserves search query parameters in the redirect url", () => {
      const request = createMockRequest("/me?section=analysis&tab=overview");
      const response = handleRouteProtection(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/login?redirect=%2Fme%3Fsection%3Danalysis%26tab%3Doverview");
    });

    it("redirects unauthenticated users from workflow sub-paths", () => {
      const testPaths = [
        "/projects/123/assets",
        "/sessions/456/processing",
        "/sessions/456/speaker-mapping",
        "/sessions/456/qa",
        "/sessions/456/report",
        "/sessions/789/report",
        "/teams/team-1/members",
        "/settings/profile",
      ];

      for (const path of testPaths) {
        const request = createMockRequest(path);
        const response = handleRouteProtection(request);

        expect(response.status).toBe(307);
        const location = response.headers.get("location");
        expect(location).toContain(`redirect=${encodeURIComponent(path)}`);
      }
    });

    it("allows authenticated users with auth_token cookie to access protected routes", () => {
      const request = createMockRequest("/me", {
        [AUTH_COOKIE_NAME]: "valid_jwt_token_value",
      });
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated users with session cookie fallback to access protected routes", () => {
      const request = createMockRequest("/projects/pitch-1", {
        [FALLBACK_SESSION_COOKIE_NAME]: "valid_session_value",
      });
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Invitation Routes (Preview vs Accept)", () => {
    it("allows unauthenticated users to access public invitation preview", () => {
      const request = createMockRequest("/invitations/token_abc123");
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects unauthenticated users attempting to accept invitation to /login", () => {
      const request = createMockRequest("/invitations/token_abc123/accept");
      const response = handleRouteProtection(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/login");
      expect(location).toContain("redirect=%2Finvitations%2Ftoken_abc123%2Faccept");
    });

    it("allows authenticated users to access invitation accept route", () => {
      const request = createMockRequest("/invitations/token_abc123/accept", {
        [AUTH_COOKIE_NAME]: "signed_in_user_token",
      });
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Exempt Auth Callback Routes", () => {
    it.each(EXEMPT_ROUTES)(
      "permits unauthenticated OIDC callback through on '%s' without redirection",
      (route) => {
        const request = createMockRequest(`${route}?code=oidc_auth_code&state=xyz`);
        const response = handleRouteProtection(request);

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      },
    );
  });

  describe("Auth Routes (/auth/login, /auth/register)", () => {
    it.each(AUTH_ROUTES)("allows unauthenticated users to view auth page '%s'", (route) => {
      const request = createMockRequest(route);
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it.each(AUTH_ROUTES)("redirects authenticated users on auth page '%s' to default destination", (route) => {
      const request = createMockRequest(route, {
        [AUTH_COOKIE_NAME]: "active_user_token",
      });
      const response = handleRouteProtection(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("http://localhost:3000/");
    });
  });

  describe("Public Routes & Team Distinction", () => {
    it.each(PUBLIC_ROUTES)("allows unauthenticated visitors to access public route '%s'", (route) => {
      const request = createMockRequest(route);
      const response = handleRouteProtection(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("keeps public /team accessible while protecting /teams workspace", () => {
      // /team is marketing company page
      const publicTeamReq = createMockRequest("/team");
      const publicTeamRes = handleRouteProtection(publicTeamReq);
      expect(publicTeamRes.status).toBe(200);

      // /teams is workspace user team management
      const protectedTeamsReq = createMockRequest("/teams");
      const protectedTeamsRes = handleRouteProtection(protectedTeamsReq);
      expect(protectedTeamsRes.status).toBe(307);
      expect(protectedTeamsRes.headers.get("location")).toContain("/login?redirect=%2Fteams");
    });
  });

  describe("Root proxy and middleware entrypoints", () => {
    it("proxy entrypoint invokes handleRouteProtection", () => {
      const request = createMockRequest("/me");
      const response = proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("backwards-compatible middleware export functions identically", () => {
      const request = createMockRequest("/me");
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });
  });
});
