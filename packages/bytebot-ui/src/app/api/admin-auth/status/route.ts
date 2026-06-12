import { NextRequest, NextResponse } from "next/server";
import {
  getAdminAuthConfig,
  getAdminSessionCookie,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const config = getAdminAuthConfig();
  const authenticated = config.enabled
    ? verifyAdminSessionToken(getAdminSessionCookie(req.headers.get("cookie")))
    : false;

  return NextResponse.json({
    enabled: config.enabled,
    authenticated,
  });
}
