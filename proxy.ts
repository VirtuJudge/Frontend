import type { NextRequest } from "next/server";
import { handleRouteProtection } from "@/lib/auth/middleware";

/**
 * Next.js 16 Proxy / Middleware entrypoint for route protection.
 */
export function proxy(request: NextRequest) {
  return handleRouteProtection(request);
}

// Backwards compatibility alias
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, and static file extensions (.svg, .png, .jpg, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
