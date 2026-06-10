import React from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { RefreshCw, Square, X } from "lucide-react";
import { CodexLoginSession } from "./types";

export const CODEX_DEVICE_AUTH_URL = "https://auth.openai.com/codex/device";

interface CodexDeviceLoginModalProps {
  session: CodexLoginSession | null;
  busy: boolean;
  onCancel: () => void;
  onClose: () => void;
}

export function CodexDeviceLoginModal({
  session,
  busy,
  onCancel,
  onClose,
}: CodexDeviceLoginModalProps) {
  const isLoginRunning = session?.status === "running";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Codex device login"
    >
      <div className="border-bytebot-bronze-light-7 w-full max-w-md rounded-lg border bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-bytebot-bronze-light-12 text-lg font-semibold">
            Device Login
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-bytebot-bronze-light-11 mt-2 text-sm">
          The Codex device authorization page has opened in a new tab. Enter
          the device code below to finish signing in.
        </p>

        <div className="mt-4 space-y-1">
          <div className="text-bytebot-bronze-light-11 text-xs font-medium">
            Device Code
          </div>
          {session?.userCode ? (
            <div className="flex min-w-0 items-center gap-2">
              <div className="border-bytebot-bronze-light-6 text-bytebot-bronze-light-12 min-w-0 flex-1 select-all break-all rounded-md border px-3 py-2 text-center font-mono text-2xl font-semibold tracking-widest">
                {session.userCode}
              </div>
              <CopyButton
                text={session.userCode}
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0"
              />
            </div>
          ) : (
            <div className="border-bytebot-bronze-light-6 text-bytebot-bronze-light-11 flex items-center justify-center gap-2 rounded-md border px-3 py-4 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Waiting for device code…
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={busy || !isLoginRunning}
            icon={<Square className="h-4 w-4" />}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open(
                session?.verificationUri || CODEX_DEVICE_AUTH_URL,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            Reopen Login Page
          </Button>
        </div>
      </div>
    </div>
  );
}
