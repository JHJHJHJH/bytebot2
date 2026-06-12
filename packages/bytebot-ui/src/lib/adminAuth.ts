import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_AUTH_COOKIE_NAME = "bytebot_ui_admin_session";
export const ADMIN_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const TOKEN_VERSION = "v1";
const PUBLIC_FILE_PATTERN =
  /\.(?:avif|bmp|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|webp|woff|woff2)$/i;

type AdminAuthConfig =
  | {
      enabled: false;
      username: null;
      password: null;
    }
  | {
      enabled: true;
      username: string;
      password: string;
    };

interface AdminSessionPayload {
  version: string;
  username: string;
  expiresAt: number;
}

export function getAdminAuthConfig(): AdminAuthConfig {
  const username = process.env.BYTEBOT_UI_ADMIN_USER;
  const password = process.env.BYTEBOT_UI_ADMIN_PASSWORD;

  if (
    typeof username === "string" &&
    username.length > 0 &&
    typeof password === "string" &&
    password.length > 0
  ) {
    return {
      enabled: true,
      username,
      password,
    };
  }

  return {
    enabled: false,
    username: null,
    password: null,
  };
}

export function isAdminAuthEnabled(): boolean {
  return getAdminAuthConfig().enabled;
}

export function validateAdminCredentials(
  username: string,
  password: string,
): boolean {
  const config = getAdminAuthConfig();

  if (!config.enabled) {
    return false;
  }

  const usernameMatches = timingSafeEqualString(username, config.username);
  const passwordMatches = timingSafeEqualString(password, config.password);

  return usernameMatches && passwordMatches;
}

export function createAdminSessionToken(now = Date.now()): string | null {
  const config = getAdminAuthConfig();

  if (!config.enabled) {
    return null;
  }

  const payload = encodeBase64Url(
    JSON.stringify({
      version: TOKEN_VERSION,
      username: config.username,
      expiresAt: now + ADMIN_AUTH_MAX_AGE_SECONDS * 1000,
    } satisfies AdminSessionPayload),
  );
  const signature = signPayload(payload, config);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | null | undefined,
  now = Date.now(),
): boolean {
  const config = getAdminAuthConfig();

  if (!config.enabled || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;
  const expectedSignature = signPayload(payload, config);

  if (!timingSafeEqualString(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdminSessionPayload>;

    return (
      parsed.version === TOKEN_VERSION &&
      parsed.username === config.username &&
      typeof parsed.expiresAt === "number" &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt > now
    );
  } catch {
    return false;
  }
}

export function getAdminSessionCookie(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (rawName !== ADMIN_AUTH_COOKIE_NAME) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function createAdminSessionCookie(
  token: string,
  secure: boolean,
): string {
  return serializeAdminCookie(encodeURIComponent(token), secure, [
    `Max-Age=${ADMIN_AUTH_MAX_AGE_SECONDS}`,
  ]);
}

export function clearAdminSessionCookie(secure: boolean): string {
  return serializeAdminCookie("", secure, [
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ]);
}

export function shouldUseSecureCookie(
  headers: Headers,
  protocol?: string,
): boolean {
  if (protocol === "https:" || protocol === "https") {
    return true;
  }

  const forwardedProto = headers.get("x-forwarded-proto");
  const firstForwardedProto = forwardedProto
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  return (
    firstForwardedProto === "https" ||
    headers.get("x-forwarded-ssl")?.toLowerCase() === "on"
  );
}

export function isAdminAuthPublicPath(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
}

export function sanitizeNextPath(value: unknown): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return "/";
  }

  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(rawValue, "http://bytebot.local");
    const nextPath = `${url.pathname}${url.search}${url.hash}`;

    if (!nextPath.startsWith("/") || nextPath.startsWith("/admin/login")) {
      return "/";
    }

    return nextPath || "/";
  } catch {
    return "/";
  }
}

function signPayload(
  payload: string,
  config: Extract<AdminAuthConfig, { enabled: true }>,
): string {
  return createHmac("sha256", getSigningSecret(config))
    .update(payload)
    .digest("base64url");
}

function getSigningSecret(
  config: Extract<AdminAuthConfig, { enabled: true }>,
): Buffer {
  return createHash("sha256")
    .update(config.username)
    .update("\0")
    .update(config.password)
    .digest();
}

function timingSafeEqualString(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function serializeAdminCookie(
  value: string,
  secure: boolean,
  attributes: string[],
): string {
  return [
    `${ADMIN_AUTH_COOKIE_NAME}=${value}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    ...attributes,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
