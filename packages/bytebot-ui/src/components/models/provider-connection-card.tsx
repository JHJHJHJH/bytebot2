import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import { TestState } from "./types";

interface ProviderConnectionCardProps {
  label: string;
  method: "API key" | "Browser login";
  connected: boolean;
  detail?: React.ReactNode;
  testState: TestState;
  testDisabled?: boolean;
  onTest: () => void;
  children: React.ReactNode;
}

function TestResult({ testState }: { testState: TestState }) {
  switch (testState.status) {
    case "testing":
      return (
        <span className="text-bytebot-bronze-light-11 flex items-center gap-1.5 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Testing…
        </span>
      );
    case "success":
      return (
        <span className="text-bytebot-green-11 flex items-center gap-1.5 text-xs font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Connected · {testState.latencyMs} ms
        </span>
      );
    case "error":
      return (
        <span className="text-bytebot-red-light-11 flex min-w-0 items-center gap-1.5 text-xs">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="break-words">{testState.message}</span>
        </span>
      );
    default:
      return null;
  }
}

export function ProviderConnectionCard({
  label,
  method,
  connected,
  detail,
  testState,
  testDisabled,
  onTest,
  children,
}: ProviderConnectionCardProps) {
  return (
    <div className="border-bytebot-bronze-light-7 rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-bytebot-bronze-light-12 truncate text-sm font-semibold">
              {label}
            </h2>
            <span className="bg-bytebot-bronze-light-3 text-bytebot-bronze-light-11 rounded-sm px-1.5 py-0.5 text-[11px] font-medium">
              {method}
            </span>
          </div>
          {detail && (
            <div className="text-bytebot-bronze-light-10 mt-1 truncate text-xs">
              {detail}
            </div>
          )}
        </div>
        <div
          className={`shrink-0 rounded-sm px-2 py-1 text-xs font-medium ${
            connected
              ? "bg-bytebot-green-3 text-bytebot-green-11"
              : "bg-bytebot-red-light-3 text-bytebot-red-light-11"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </div>
      </div>

      <div className="mt-3">{children}</div>

      <div className="border-bytebot-bronze-light-5 mt-3 flex items-center gap-3 border-t pt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={testDisabled || testState.status === "testing"}
          icon={<PlugZap className="h-4 w-4" />}
          aria-label={`Test ${label} connection`}
        >
          Test
        </Button>
        <TestResult testState={testState} />
      </div>
    </div>
  );
}
