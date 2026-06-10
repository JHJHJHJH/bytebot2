import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type ModelProviderId = 'anthropic' | 'openai' | 'google';

interface ModelProviderDefinition {
  id: ModelProviderId;
  label: string;
  envVar: string;
}

interface ManagedModelKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
}

export interface ModelKeyStatus {
  id: ModelProviderId;
  label: string;
  envVar: string;
  configured: boolean;
  source: 'managed' | 'environment' | 'unset';
  maskedValue?: string;
}

export interface ModelKeyTestResult {
  ok: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
}

const PROVIDERS: ModelProviderDefinition[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
  },
];

// Cheap, zero-token requests used to verify that a key is accepted.
const PROVIDER_TESTS: Record<
  ModelProviderId,
  { url: string; headers: (apiKey: string) => Record<string, string> }
> = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/models?limit=1',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
  },
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
    headers: (apiKey) => ({ 'x-goog-api-key': apiKey }),
  },
};

const TEST_TIMEOUT_MS = 10_000;
const TEST_ERROR_MAX_LENGTH = 300;

@Injectable()
export class ModelKeysService {
  private readonly logger = new Logger(ModelKeysService.name);
  private readonly configDir =
    process.env.BYTEBOT_AGENT_CONFIG_DIR ||
    path.join(process.cwd(), '.bytebot-agent');
  private readonly keysFilePath = path.join(this.configDir, 'model-keys.json');
  private managedKeys: ManagedModelKeys = {};

  constructor() {
    this.loadManagedKeys();
  }

  getStatuses(): ModelKeyStatus[] {
    return PROVIDERS.map((provider) => this.getStatus(provider.id));
  }

  getStatus(providerId: ModelProviderId): ModelKeyStatus {
    const provider = this.getProvider(providerId);
    const managedValue = this.managedKeys[provider.id];
    const envValue = process.env[provider.envVar];
    const value = managedValue || envValue;

    return {
      id: provider.id,
      label: provider.label,
      envVar: provider.envVar,
      configured: Boolean(value),
      source: managedValue ? 'managed' : envValue ? 'environment' : 'unset',
      maskedValue: value ? this.maskSecret(value) : undefined,
    };
  }

  getApiKey(providerId: ModelProviderId): string | undefined {
    const provider = this.getProvider(providerId);
    return process.env[provider.envVar];
  }

  isConfigured(providerId: ModelProviderId): boolean {
    return Boolean(this.getApiKey(providerId));
  }

  setApiKey(providerId: ModelProviderId, apiKey: string): ModelKeyStatus {
    const provider = this.getProvider(providerId);
    const trimmedApiKey = apiKey.trim();

    if (!trimmedApiKey) {
      throw new Error(`${provider.envVar} is required`);
    }

    this.managedKeys[provider.id] = trimmedApiKey;
    process.env[provider.envVar] = trimmedApiKey;
    this.writeManagedKeys();

    return this.getStatus(provider.id);
  }

  async testApiKey(providerId: ModelProviderId): Promise<ModelKeyTestResult> {
    const provider = this.getProvider(providerId);
    const apiKey = this.getApiKey(provider.id);

    if (!apiKey) {
      throw new Error(`${provider.envVar} is not configured`);
    }

    const test = PROVIDER_TESTS[provider.id];
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(test.url, {
        headers: test.headers(apiKey),
        signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: this.truncateError(
          `Could not reach ${new URL(test.url).host}: ${message}`,
        ),
      };
    }

    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      return { ok: true, latencyMs, status: response.status };
    }

    return {
      ok: false,
      latencyMs,
      status: response.status,
      error: this.truncateError(await this.readProviderError(response)),
    };
  }

  clearApiKey(providerId: ModelProviderId): ModelKeyStatus {
    const provider = this.getProvider(providerId);

    delete this.managedKeys[provider.id];
    delete process.env[provider.envVar];
    this.writeManagedKeys();

    return this.getStatus(provider.id);
  }

  private loadManagedKeys() {
    try {
      if (!fs.existsSync(this.keysFilePath)) {
        return;
      }

      const parsed = JSON.parse(
        fs.readFileSync(this.keysFilePath, 'utf8'),
      ) as ManagedModelKeys;

      this.managedKeys = {};
      for (const provider of PROVIDERS) {
        const value = parsed[provider.id];
        if (typeof value === 'string' && value.trim()) {
          this.managedKeys[provider.id] = value.trim();
          process.env[provider.envVar] = value.trim();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load managed model keys: ${message}`);
    }
  }

  private writeManagedKeys() {
    fs.mkdirSync(this.configDir, { recursive: true });
    fs.writeFileSync(
      this.keysFilePath,
      `${JSON.stringify(this.managedKeys, null, 2)}\n`,
      { mode: 0o600 },
    );
  }

  private getProvider(providerId: ModelProviderId): ModelProviderDefinition {
    const provider = PROVIDERS.find((item) => item.id === providerId);
    if (!provider) {
      throw new Error(`Unknown model provider: ${providerId}`);
    }
    return provider;
  }

  private async readProviderError(response: Response): Promise<string> {
    const fallback = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as {
        error?: { message?: string } | string;
      };

      if (typeof body.error === 'string') {
        return body.error || fallback;
      }

      return body.error?.message || fallback;
    } catch {
      return fallback;
    }
  }

  private truncateError(message: string): string {
    if (message.length <= TEST_ERROR_MAX_LENGTH) {
      return message;
    }

    return `${message.slice(0, TEST_ERROR_MAX_LENGTH)}…`;
  }

  private maskSecret(value: string): string {
    if (value.length <= 8) {
      return '••••';
    }

    return `••••${value.slice(-4)}`;
  }
}
