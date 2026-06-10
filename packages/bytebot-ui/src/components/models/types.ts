export type ModelProviderId = "anthropic" | "openai" | "google";
export type ProviderKey = ModelProviderId | "codex";

export type LoginStatus = "running" | "completed" | "failed" | "cancelled";

export interface CodexLoginSession {
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

export interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
  authFileExists: boolean;
  codexHome: string;
  authFilePath: string;
  version?: string;
  activeLogin: CodexLoginSession | null;
}

export interface ModelKeyStatus {
  id: ModelProviderId;
  label: string;
  envVar: string;
  configured: boolean;
  source: "managed" | "environment" | "unset";
  maskedValue?: string;
}

export interface ModelKeysResponse {
  providers: ModelKeyStatus[];
}

export interface ConnectionTestResponse {
  ok: boolean;
  latencyMs: number;
  status?: number;
  detail?: string;
  error?: string;
}

export type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; latencyMs: number }
  | { status: "error"; message: string };
