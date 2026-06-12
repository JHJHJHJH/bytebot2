const DEFAULT_DEV_AGENT_BASE_URL = "http://localhost:9991";
const DEFAULT_DEV_DESKTOP_BASE_URL = "http://localhost:9990";
const DEFAULT_DEV_DESKTOP_VNC_URL = "ws://localhost:9990/websockify";
const DEFAULT_DOCS_BASE_URL = "http://localhost:9993";

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizeBaseUrl(value: string, envName: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${envName} must be a valid absolute URL. Received: ${value}`);
  }
}

function normalizeUrl(value: string, envName: string): string {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${envName} must be a valid absolute URL. Received: ${value}`);
  }
}

export function getAgentBaseUrl(): string {
  const configuredUrl =
    envValue("BYTEBOT_AGENT_BASE_URL") || envValue("NEXT_PUBLIC_API_URL");

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl, "BYTEBOT_AGENT_BASE_URL");
  }

  if (!isProduction()) {
    return DEFAULT_DEV_AGENT_BASE_URL;
  }

  throw new Error("BYTEBOT_AGENT_BASE_URL is not configured");
}

export function getDesktopBaseUrl(): string {
  const configuredUrl = envValue("BYTEBOT_DESKTOP_BASE_URL");

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl, "BYTEBOT_DESKTOP_BASE_URL");
  }

  const vncUrl = envValue("BYTEBOT_DESKTOP_VNC_URL");
  if (vncUrl) {
    const parsedUrl = new URL(normalizeUrl(vncUrl, "BYTEBOT_DESKTOP_VNC_URL"));
    const protocol =
      parsedUrl.protocol === "wss:"
        ? "https:"
        : parsedUrl.protocol === "ws:"
          ? "http:"
          : parsedUrl.protocol;

    return `${protocol}//${parsedUrl.host}`;
  }

  if (!isProduction()) {
    return DEFAULT_DEV_DESKTOP_BASE_URL;
  }

  throw new Error("BYTEBOT_DESKTOP_BASE_URL is not configured");
}

export function getDesktopVncUrl(): string {
  const configuredUrl = envValue("BYTEBOT_DESKTOP_VNC_URL");

  if (configuredUrl) {
    return normalizeUrl(configuredUrl, "BYTEBOT_DESKTOP_VNC_URL");
  }

  if (!isProduction()) {
    return DEFAULT_DEV_DESKTOP_VNC_URL;
  }

  throw new Error("BYTEBOT_DESKTOP_VNC_URL is not configured");
}

export function getDocsBaseUrl(): string {
  return normalizeBaseUrl(
    envValue("BYTEBOT_DOCS_BASE_URL") || DEFAULT_DOCS_BASE_URL,
    "BYTEBOT_DOCS_BASE_URL",
  );
}
