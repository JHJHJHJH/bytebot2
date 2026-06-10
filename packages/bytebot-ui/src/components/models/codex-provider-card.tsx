import React from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Square } from "lucide-react";
import { ProviderConnectionCard } from "./provider-connection-card";
import { CodexLoginSession, CodexStatus, TestState } from "./types";

interface CodexProviderCardProps {
  status: CodexStatus | null;
  session: CodexLoginSession | null;
  testState: TestState;
  busy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onCancelLogin: () => void;
  onTest: () => void;
}

function formatLoginOutput(output?: string): string {
  if (!output) {
    return "No active login.";
  }

  // Replace the Codex success message with a tick symbol.
  return output.replace(/login succeeded[.!]?/gi, "✓");
}

export function CodexProviderCard({
  status,
  session,
  testState,
  busy,
  onSignIn,
  onSignOut,
  onCancelLogin,
  onTest,
}: CodexProviderCardProps) {
  const isLoginRunning = session?.status === "running";

  const detail = !status
    ? "Checking…"
    : !status.installed
      ? "Codex CLI not installed"
      : `${status.version || "Installed"} · ${
          status.authenticated ? "session active" : "no session"
        }`;

  return (
    <ProviderConnectionCard
      label="OpenAI Codex"
      method="Browser login"
      connected={Boolean(status?.authenticated)}
      detail={detail}
      testState={testState}
      testDisabled={busy || !status?.installed}
      onTest={onTest}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          {status?.authenticated ? (
            <Button
              className="flex-1"
              variant="outline"
              onClick={onSignOut}
              disabled={busy}
              icon={<LogOut className="h-4 w-4" />}
            >
              Sign out
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={onSignIn}
              disabled={busy || isLoginRunning || !status?.installed}
              icon={<LogIn className="h-4 w-4" />}
            >
              Sign in
            </Button>
          )}
          {isLoginRunning && (
            <Button
              variant="outline"
              onClick={onCancelLogin}
              disabled={busy}
              icon={<Square className="h-4 w-4" />}
            >
              Cancel
            </Button>
          )}
        </div>

        <details className="border-bytebot-bronze-light-6 rounded-md border">
          <summary className="text-bytebot-bronze-light-11 cursor-pointer px-3 py-2 text-xs font-medium select-none">
            Login output
          </summary>
          <pre className="text-bytebot-bronze-light-11 border-bytebot-bronze-light-6 max-h-[240px] overflow-auto border-t p-3 text-xs whitespace-pre-wrap">
            {formatLoginOutput(session?.output)}
          </pre>
        </details>
      </div>
    </ProviderConnectionCard>
  );
}
