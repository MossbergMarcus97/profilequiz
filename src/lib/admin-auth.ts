import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMIT_CONFIGS } from "./rate-limit";

/**
 * Verify admin authentication from cookie.
 * Returns null if authorized, or a NextResponse error if unauthorized.
 */
export function verifyAdminAuth(): NextResponse | null {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get("admin_pass")?.value;
  
  if (adminCookie !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Unauthorized - Please log in to admin panel first" },
      { status: 401 }
    );
  }
  
  return null; // Authorized
}

/**
 * Rate limiter for admin endpoints.
 * Re-exports from shared rate-limit module with admin config.
 */
export function checkRateLimit(identifier: string): NextResponse | null {
  return sharedCheckRateLimit(`admin:${identifier}`, RATE_LIMIT_CONFIGS.admin);
}

