"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ApiKeyProviderCard } from "@/components/models/api-key-provider-card";
import { CodexProviderCard } from "@/components/models/codex-provider-card";
import {
  CODEX_DEVICE_AUTH_URL,
  CodexDeviceLoginModal,
} from "@/components/models/codex-device-login-modal";
import {
  CodexLoginSession,
  CodexStatus,
  ConnectionTestResponse,
  ModelKeysResponse,
  ModelProviderId,
  ProviderKey,
  TestState,
} from "@/components/models/types";

const IDLE_TEST_STATES: Record<ProviderKey, TestState> = {
  anthropic: { status: "idle" },
  openai: { status: "idle" },
  google: { status: "idle" },
  codex: { status: "idle" },
};

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

export default function ModelsPage() {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [session, setSession] = useState<CodexLoginSession | null>(null);
  const [modelKeys, setModelKeys] = useState<ModelKeysResponse | null>(null);
  const [testStates, setTestStates] =
    useState<Record<ProviderKey, TestState>>(IDLE_TEST_STATES);
  const [busy, setBusy] = useState<Partial<Record<ProviderKey, boolean>>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  const isLoginRunning = session?.status === "running";

  const setTestState = useCallback((key: ProviderKey, state: TestState) => {
    setTestStates((current) => ({ ...current, [key]: state }));
  }, []);

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
    setIsRefreshing(true);
    setPageError(null);
    try {
      await Promise.all([refreshCodex(), refreshModelKeys()]);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCodex, refreshModelKeys]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLoginRunning) return;

    const interval = window.setInterval(() => {
      desktopRequest<CodexLoginSession | null>("/login/session")
        .then((nextSession) => {
          setSession(nextSession);
          if (nextSession?.status !== "running") {
            refreshCodex().catch((err) =>
              setPageError(err instanceof Error ? err.message : String(err)),
            );
          }
        })
        .catch((err) =>
          setPageError(err instanceof Error ? err.message : String(err)),
        );
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isLoginRunning, refreshCodex]);

  // Close the device modal once the login is no longer pending.
  useEffect(() => {
    if (session && session.status !== "running") {
      setIsDeviceModalOpen(false);
    }
  }, [session]);

  const runProviderAction = useCallback(
    async (key: ProviderKey, action: () => Promise<void>) => {
      setBusy((current) => ({ ...current, [key]: true }));
      try {
        await action();
      } catch (err) {
        setTestState(key, {
          status: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
      } finally {
        setBusy((current) => ({ ...current, [key]: false }));
      }
    },
    [setTestState],
  );

  const saveModelKey = (providerId: ModelProviderId, apiKey: string) =>
    runProviderAction(providerId, async () => {
      await agentRequest(`/model-keys/${providerId}`, {
        method: "POST",
        body: JSON.stringify({ apiKey }),
      });
      setTestState(providerId, { status: "idle" });
      await refreshModelKeys();
    });

  const removeModelKey = (providerId: ModelProviderId) =>
    runProviderAction(providerId, async () => {
      await agentRequest(`/model-keys/${providerId}`, { method: "DELETE" });
      setTestState(providerId, { status: "idle" });
      await refreshModelKeys();
    });

  const testConnection = (key: ProviderKey) =>
    runProviderAction(key, async () => {
      setTestState(key, { status: "testing" });

      const result =
        key === "codex"
          ? await desktopRequest<ConnectionTestResponse>("/test", {
              method: "POST",
            })
          : await agentRequest<ConnectionTestResponse>(
              `/model-keys/${key}/test`,
              { method: "POST" },
            );

      setTestState(
        key,
        result.ok
          ? { status: "success", latencyMs: result.latencyMs }
          : { status: "error", message: result.error || "Connection failed" },
      );
    });

  const startLogin = () => {
    // Open the device authorization page in a new tab as part of the click
    // gesture so it is not blocked by the browser's popup blocker.
    window.open(CODEX_DEVICE_AUTH_URL, "_blank", "noopener,noreferrer");
    setIsDeviceModalOpen(true);

    return runProviderAction("codex", async () => {
      const nextSession = await desktopRequest<CodexLoginSession>(
        "/login/device",
        { method: "POST" },
      );
      setSession(nextSession);
    });
  };

  const cancelLogin = () =>
    runProviderAction("codex", async () => {
      const nextSession = await desktopRequest<CodexLoginSession | null>(
        "/login/cancel",
        { method: "POST" },
      );
      setSession(nextSession);
      setIsDeviceModalOpen(false);
    });

  const logout = () =>
    runProviderAction("codex", async () => {
      const nextStatus = await desktopRequest<CodexStatus>("/logout", {
        method: "POST",
      });
      setStatus(nextStatus);
      setSession(nextStatus.activeLogin);
      setTestState("codex", { status: "idle" });
    });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-bytebot-bronze-light-12 text-lg font-semibold">
                Model Connections
              </h1>
              <p className="text-bytebot-bronze-light-11 text-sm">
                Connect LLM providers with an API key or a browser login.
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              aria-label="Refresh connection status"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {pageError && (
            <div className="border-bytebot-red-light-7 bg-bytebot-red-light-2 text-bytebot-red-light-11 rounded-md border p-3 text-sm">
              {pageError}
            </div>
          )}

          {modelKeys?.providers.map((provider) => (
            <ApiKeyProviderCard
              key={provider.id}
              provider={provider}
              testState={testStates[provider.id]}
              busy={Boolean(busy[provider.id])}
              onSave={(apiKey) => saveModelKey(provider.id, apiKey)}
              onRemove={() => removeModelKey(provider.id)}
              onTest={() => testConnection(provider.id)}
            />
          ))}
          {!modelKeys && (
            <div className="border-bytebot-bronze-light-7 text-bytebot-bronze-light-11 rounded-lg border bg-white p-4 text-sm">
              Checking provider keys…
            </div>
          )}

          <CodexProviderCard
            status={status}
            session={session}
            testState={testStates.codex}
            busy={Boolean(busy.codex)}
            onSignIn={() => void startLogin()}
            onSignOut={() => void logout()}
            onCancelLogin={() => void cancelLogin()}
            onTest={() => testConnection("codex")}
          />
        </div>
      </main>

      {isDeviceModalOpen && (
        <CodexDeviceLoginModal
          session={session}
          busy={Boolean(busy.codex)}
          onCancel={() => void cancelLogin()}
          onClose={() => setIsDeviceModalOpen(false)}
        />
      )}
    </div>
  );
}
