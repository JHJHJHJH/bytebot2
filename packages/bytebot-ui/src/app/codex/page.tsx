"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { DesktopContainer } from "@/components/ui/desktop-container";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  KeyRound,
  LogOut,
  MonitorUp,
  RefreshCw,
  Save,
  ShieldCheck,
  Square,
  Terminal,
  Trash2,
} from "lucide-react";

type LoginStatus = "running" | "completed" | "failed" | "cancelled";
type ModelProviderId = "anthropic" | "openai" | "google";

interface CodexLoginSession {
  id: string;
  method: "device";
  status: LoginStatus;
  output: string;
  verificationUri?: string;
  userCode?: string;
  startedAt: string;
  completedAt?: string;
  exitCode?: number | null;
  error?: string;
}

interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
  authFileExists: boolean;
  codexHome: string;
  authFilePath: string;
  version?: string;
  activeLogin: CodexLoginSession | null;
}

interface ModelKeyStatus {
  id: ModelProviderId;
  label: string;
  envVar: string;
  configured: boolean;
  source: "managed" | "environment" | "unset";
  maskedValue?: string;
}

interface ModelKeysResponse {
  providers: ModelKeyStatus[];
}

async function desktopRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/desktop/codex${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }

  return res.json();
}

async function agentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }

  return res.json();
}

export default function CodexPage() {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [session, setSession] = useState<CodexLoginSession | null>(null);
  const [modelKeys, setModelKeys] = useState<ModelKeysResponse | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<ModelProviderId, string>>({
    anthropic: "",
    openai: "",
    google: "",
  });
  const [codexApiKey, setCodexApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoginRunning = session?.status === "running";
  const hasDeviceLoginDetails = Boolean(
    session?.verificationUri || session?.userCode,
  );

  const statusLabel = useMemo(() => {
    if (!status) return "Checking";
    if (!status?.installed) return "CLI missing";
    if (status.authenticated) return "Signed in";
    return "Not signed in";
  }, [status]);

  const refreshCodex = useCallback(async () => {
    const nextStatus = await desktopRequest<CodexStatus>("/status");
    setStatus(nextStatus);
    setSession(nextStatus.activeLogin);
  }, []);

  const refreshModelKeys = useCallback(async () => {
    const nextModelKeys = await agentRequest<ModelKeysResponse>("/model-keys");
    setModelKeys(nextModelKeys);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([refreshCodex(), refreshModelKeys()]);
  }, [refreshCodex, refreshModelKeys]);

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, [refresh]);

  useEffect(() => {
    if (!isLoginRunning) return;

    const interval = window.setInterval(() => {
      desktopRequest<CodexLoginSession | null>("/login/session")
        .then((nextSession) => {
          setSession(nextSession);
          if (nextSession?.status !== "running") {
            refreshCodex().catch((err) => setError(err.message));
          }
        })
        .catch((err) => setError(err.message));
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isLoginRunning, refreshCodex]);

  const runAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const startDeviceLogin = () =>
    runAction(async () => {
      const nextSession = await desktopRequest<CodexLoginSession>(
        "/login/device",
        {
          method: "POST",
        },
      );
      setSession(nextSession);
    });

  const openTerminalLogin = () =>
    runAction(async () => {
      await desktopRequest<{ success: boolean }>("/login/terminal", {
        method: "POST",
      });
    });

  const saveAccessToken = () =>
    runAction(async () => {
      const nextStatus = await desktopRequest<CodexStatus>(
        "/login/access-token",
        {
          method: "POST",
          body: JSON.stringify({ accessToken }),
        },
      );
      setAccessToken("");
      setStatus(nextStatus);
      setSession(nextStatus.activeLogin);
    });

  const saveCodexApiKey = () =>
    runAction(async () => {
      const nextStatus = await desktopRequest<CodexStatus>("/login/api-key", {
        method: "POST",
        body: JSON.stringify({ apiKey: codexApiKey }),
      });
      setCodexApiKey("");
      setStatus(nextStatus);
      setSession(nextStatus.activeLogin);
      await refreshModelKeys();
    });

  const cancelLogin = () =>
    runAction(async () => {
      const nextSession = await desktopRequest<CodexLoginSession | null>(
        "/login/cancel",
        { method: "POST" },
      );
      setSession(nextSession);
    });

  const logout = () =>
    runAction(async () => {
      const nextStatus = await desktopRequest<CodexStatus>("/logout", {
        method: "POST",
      });
      setStatus(nextStatus);
      setSession(nextStatus.activeLogin);
    });

  const saveModelKey = (providerId: ModelProviderId) =>
    runAction(async () => {
      await agentRequest<ModelKeyStatus>(`/model-keys/${providerId}`, {
        method: "POST",
        body: JSON.stringify({ apiKey: keyInputs[providerId] }),
      });
      setKeyInputs((current) => ({ ...current, [providerId]: "" }));
      await refreshModelKeys();
    });

  const clearModelKey = (providerId: ModelProviderId) =>
    runAction(async () => {
      await agentRequest<ModelKeyStatus>(`/model-keys/${providerId}`, {
        method: "DELETE",
      });
      setKeyInputs((current) => ({ ...current, [providerId]: "" }));
      await refreshModelKeys();
    });

  const updateKeyInput = (providerId: ModelProviderId, value: string) => {
    setKeyInputs((current) => ({ ...current, [providerId]: value }));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)] gap-4 overflow-hidden p-4 max-lg:grid-cols-1 max-lg:overflow-auto">
        <section className="border-bytebot-bronze-light-7 flex min-h-0 flex-col gap-4 overflow-auto rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-bytebot-bronze-light-12 text-lg font-semibold">
                Model Access
              </h1>
              <p className="text-bytebot-bronze-light-11 text-sm">
                {statusLabel}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => runAction(refresh)}
              disabled={isLoading}
              aria-label="Refresh Codex status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="border-bytebot-bronze-light-6 rounded-md border p-3">
              <div className="text-bytebot-bronze-light-11">CLI</div>
              <div className="text-bytebot-bronze-light-12 mt-1 font-medium">
                {status?.installed ? status.version || "Installed" : "Missing"}
              </div>
            </div>
            <div className="border-bytebot-bronze-light-6 rounded-md border p-3">
              <div className="text-bytebot-bronze-light-11">Session</div>
              <div className="text-bytebot-bronze-light-12 mt-1 font-medium">
                {status?.authenticated ? "Active" : "Inactive"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-bytebot-bronze-light-12 text-sm font-medium">
              Task Model Keys
            </div>
            <div className="space-y-2">
              {modelKeys?.providers.map((provider) => (
                <div
                  key={provider.id}
                  className="border-bytebot-bronze-light-6 rounded-md border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-bytebot-bronze-light-12 truncate text-sm font-medium">
                        {provider.label}
                      </div>
                      <div className="text-bytebot-bronze-light-10 truncate text-xs">
                        {provider.envVar}
                      </div>
                    </div>
                    <div
                      className={`rounded-sm px-2 py-1 text-xs font-medium ${
                        provider.configured
                          ? "bg-bytebot-green-3 text-bytebot-green-11"
                          : "bg-bytebot-red-light-3 text-bytebot-red-light-11"
                      }`}
                    >
                      {provider.configured ? "Configured" : "Missing"}
                    </div>
                  </div>

                  <div className="text-bytebot-bronze-light-11 mt-2 text-xs">
                    {provider.maskedValue || "No key"} · {provider.source}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      type="password"
                      value={keyInputs[provider.id]}
                      onChange={(event) =>
                        updateKeyInput(provider.id, event.target.value)
                      }
                      placeholder="API key"
                      autoComplete="off"
                    />
                    <Button
                      size="icon"
                      onClick={() => saveModelKey(provider.id)}
                      disabled={isLoading || !keyInputs[provider.id].trim()}
                      aria-label={`Save ${provider.label} key`}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => clearModelKey(provider.id)}
                      disabled={isLoading || !provider.configured}
                      aria-label={`Clear ${provider.label} key`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!modelKeys && (
                <div className="border-bytebot-bronze-light-6 text-bytebot-bronze-light-11 rounded-md border p-3 text-sm">
                  Checking keys.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-bytebot-bronze-light-12 text-sm font-medium">
              Codex CLI
            </div>
            <Button
              className="w-full"
              onClick={startDeviceLogin}
              disabled={isLoading || isLoginRunning || !status?.installed}
              icon={<MonitorUp className="h-4 w-4" />}
            >
              Device Login
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={openTerminalLogin}
              disabled={isLoading || !status?.installed}
              icon={<Terminal className="h-4 w-4" />}
            >
              Terminal Login
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="password"
                value={codexApiKey}
                onChange={(event) => setCodexApiKey(event.target.value)}
                placeholder="Codex API key"
                autoComplete="off"
              />
              <Button
                onClick={saveCodexApiKey}
                disabled={
                  isLoading || !codexApiKey.trim() || !status?.installed
                }
                aria-label="Save Codex API key"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="Codex access token"
                autoComplete="off"
              />
              <Button
                onClick={saveAccessToken}
                disabled={
                  isLoading || !accessToken.trim() || !status?.installed
                }
                aria-label="Save Codex access token"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={logout}
              disabled={isLoading || !status?.authenticated}
              icon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={cancelLogin}
              disabled={isLoading || !isLoginRunning}
              icon={<Square className="h-4 w-4" />}
            >
              Cancel
            </Button>
          </div>

          {error && (
            <div className="border-bytebot-red-light-7 bg-bytebot-red-light-2 text-bytebot-red-light-11 rounded-md border p-3 text-sm">
              {error}
            </div>
          )}

          <div className="border-bytebot-bronze-light-6 min-h-[180px] rounded-md border">
            <div className="border-bytebot-bronze-light-6 flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Login Output
            </div>
            {hasDeviceLoginDetails && (
              <div className="border-bytebot-bronze-light-6 space-y-3 border-b p-3">
                {session?.verificationUri && (
                  <div className="space-y-1">
                    <div className="text-bytebot-bronze-light-11 text-xs font-medium">
                      Device URL
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="border-bytebot-bronze-light-6 text-bytebot-bronze-light-12 min-w-0 flex-1 truncate rounded-md border px-3 py-2 font-mono text-xs">
                        {session.verificationUri}
                      </div>
                      <CopyButton
                        text={session.verificationUri}
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            session.verificationUri,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        aria-label="Open Codex device login"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {session?.userCode && (
                  <div className="space-y-1">
                    <div className="text-bytebot-bronze-light-11 text-xs font-medium">
                      Device Code
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="border-bytebot-bronze-light-6 text-bytebot-bronze-light-12 min-w-0 flex-1 select-all break-all rounded-md border px-3 py-2 font-mono text-lg font-semibold">
                        {session.userCode}
                      </div>
                      <CopyButton
                        text={session.userCode}
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <pre className="text-bytebot-bronze-light-11 max-h-[300px] overflow-auto p-3 text-xs whitespace-pre-wrap">
              {session?.output || "No active login."}
            </pre>
          </div>
        </section>

        <section className="min-h-0">
          <DesktopContainer
            viewOnly={false}
            status={status?.authenticated ? "running" : "live_view"}
            className="h-full"
          />
        </section>
      </main>
    </div>
  );
}
