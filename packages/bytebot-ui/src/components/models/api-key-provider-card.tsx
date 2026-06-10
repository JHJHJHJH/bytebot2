import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2 } from "lucide-react";
import { ProviderConnectionCard } from "./provider-connection-card";
import { ModelKeyStatus, TestState } from "./types";

interface ApiKeyProviderCardProps {
  provider: ModelKeyStatus;
  testState: TestState;
  busy: boolean;
  onSave: (apiKey: string) => Promise<void>;
  onRemove: () => void;
  onTest: () => void;
}

export function ApiKeyProviderCard({
  provider,
  testState,
  busy,
  onSave,
  onRemove,
  onTest,
}: ApiKeyProviderCardProps) {
  const [keyInput, setKeyInput] = useState("");

  const save = async () => {
    await onSave(keyInput.trim());
    setKeyInput("");
  };

  return (
    <ProviderConnectionCard
      label={provider.label}
      method="API key"
      connected={provider.configured}
      detail={
        provider.configured
          ? `${provider.envVar} · ${provider.maskedValue} · ${provider.source}`
          : provider.envVar
      }
      testState={testState}
      testDisabled={busy || !provider.configured}
      onTest={onTest}
    >
      <div className="flex gap-2">
        <Input
          type="password"
          value={keyInput}
          onChange={(event) => setKeyInput(event.target.value)}
          placeholder={provider.configured ? "Replace API key" : "API key"}
          autoComplete="off"
        />
        <Button
          size="icon"
          onClick={() => void save()}
          disabled={busy || !keyInput.trim()}
          aria-label={`Save ${provider.label} key`}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onRemove}
          disabled={busy || !provider.configured}
          aria-label={`Remove ${provider.label} key`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </ProviderConnectionCard>
  );
}
