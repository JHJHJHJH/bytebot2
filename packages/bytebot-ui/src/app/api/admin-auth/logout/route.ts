import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  shouldUseSecureCookie,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    authenticated: false,
  });

  response.headers.append(
    "Set-Cookie",
    clearAdminSessionCookie(
      shouldUseSecureCookie(req.headers, req.nextUrl.protocol),
    ),
  );

  return response;
}
