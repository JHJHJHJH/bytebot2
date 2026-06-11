import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionCookie,
  createAdminSessionToken,
  getAdminAuthConfig,
  sanitizeNextPath,
  shouldUseSecureCookie,
  validateAdminCredentials,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const config = getAdminAuthConfig();

  if (!config.enabled) {
    return NextResponse.json({
      enabled: false,
      authenticated: false,
      redirectTo: "/",
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 400 },
    );
  }

  const payload = body as {
    username?: unknown;
    password?: unknown;
    next?: unknown;
  };
  const username = typeof payload.username === "string" ? payload.username : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!validateAdminCredentials(username, password)) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Admin authentication is not configured" },
      { status: 503 },
    );
  }

  const response = NextResponse.json({
    enabled: true,
    authenticated: true,
    redirectTo: sanitizeNextPath(payload.next),
  });

  response.headers.append(
    "Set-Cookie",
    createAdminSessionCookie(
      token,
      shouldUseSecureCookie(req.headers, req.nextUrl.protocol),
    ),
  );

  return response;
}
