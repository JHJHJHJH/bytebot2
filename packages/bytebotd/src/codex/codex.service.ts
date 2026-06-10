import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';

type CodexLoginMethod = 'device';
type CodexLoginStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface CodexLoginSession {
  id: string;
  method: CodexLoginMethod;
  status: CodexLoginStatus;
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

export interface CodexExecImage {
  name?: string;
  data: string;
  mediaType?: string;
}

export interface CodexExecRequest {
  prompt: string;
  model?: string;
  outputSchema?: Record<string, unknown>;
  images?: CodexExecImage[];
}

export interface CodexExecResponse {
  output: string;
  stdout: string;
  stderr: string;
}

export interface CodexTestResult {
  ok: boolean;
  latencyMs: number;
  detail?: string;
  error?: string;
}

@Injectable()
export class CodexService implements OnModuleDestroy {
  private readonly logger = new Logger(CodexService.name);
  private readonly homeDir =
    process.env.BYTEBOT_USER_HOME ||
    (process.env.HOME && process.env.HOME !== '/root'
      ? process.env.HOME
      : '/home/user');
  private readonly codexHome =
    process.env.CODEX_HOME || path.join(this.homeDir, '.codex');
  private readonly authFilePath = path.join(this.codexHome, 'auth.json');
  private activeLogin: CodexLoginSession | null = null;
  private activeLoginProcess: ChildProcessWithoutNullStreams | null = null;

  onModuleDestroy() {
    this.activeLoginProcess?.kill();
  }

  async getStatus(): Promise<CodexStatus> {
    await this.ensureCodexHome();

    const version = await this.getCodexVersion();
    const authFileExists = await this.fileExists(this.authFilePath);
    const authFileUsable = authFileExists && (await this.hasUsableAuthFile());

    return {
      installed: Boolean(version),
      authenticated: Boolean(process.env.CODEX_ACCESS_TOKEN) || authFileUsable,
      authFileExists,
      codexHome: this.codexHome,
      authFilePath: this.authFilePath,
      version,
      activeLogin: this.activeLogin,
    };
  }

  async startDeviceLogin(): Promise<CodexLoginSession> {
    if (this.activeLogin?.status === 'running') {
      return this.activeLogin;
    }

    await this.ensureCodexHome();

    const session: CodexLoginSession = {
      id: randomUUID(),
      method: 'device',
      status: 'running',
      output: '',
      startedAt: new Date().toISOString(),
    };

    const child = spawn(
      'codex',
      this.withFileCredentialStore(['login', '--device-auth']),
      {
        env: this.commandEnv(),
        cwd: this.homeDir,
        stdio: 'pipe',
      },
    );

    this.activeLogin = session;
    this.activeLoginProcess = child;

    child.stdout.on('data', (chunk) => {
      this.appendLoginOutput(chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      this.appendLoginOutput(chunk.toString());
    });

    child.on('error', (error) => {
      session.status = 'failed';
      session.error = error.message;
      session.completedAt = new Date().toISOString();
      this.activeLoginProcess = null;
    });

    child.on('close', (code) => {
      if (session.status === 'cancelled') {
        return;
      }

      session.status = code === 0 ? 'completed' : 'failed';
      session.exitCode = code;
      session.completedAt = new Date().toISOString();
      this.activeLoginProcess = null;
    });

    return session;
  }

  async cancelLogin(): Promise<CodexLoginSession | null> {
    if (!this.activeLogin || this.activeLogin.status !== 'running') {
      return this.activeLogin;
    }

    this.activeLogin.status = 'cancelled';
    this.activeLogin.completedAt = new Date().toISOString();
    this.activeLoginProcess?.kill();
    this.activeLoginProcess = null;

    return this.activeLogin;
  }

  getLoginSession(): CodexLoginSession | null {
    return this.activeLogin;
  }

  async logout(): Promise<CodexStatus> {
    await this.cancelLogin();
    await this.ensureCodexHome();

    try {
      await this.runCodex(['logout'], { timeoutMs: 60000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`codex logout failed: ${message}`);
    }

    await fs.rm(this.authFilePath, { force: true });

    return this.getStatus();
  }

  async testAuth(): Promise<CodexTestResult> {
    await this.ensureCodexHome();

    const startedAt = Date.now();
    const version = await this.getCodexVersion();

    if (!version) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: 'Codex CLI is not installed',
      };
    }

    try {
      const result = await this.runCodex(['login', 'status'], {
        timeoutMs: 15000,
      });
      return {
        ok: true,
        latencyMs: Date.now() - startedAt,
        detail: result.stdout.trim() || result.stderr.trim() || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Older CLIs without `login status`: fall back to the auth-file check.
      if (/unrecognized|unexpected|usage/i.test(message)) {
        const status = await this.getStatus();
        return {
          ok: status.authenticated,
          latencyMs: Date.now() - startedAt,
          detail: status.authenticated
            ? 'Auth credentials found'
            : undefined,
          error: status.authenticated ? undefined : 'Codex is not signed in',
        };
      }

      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: message,
      };
    }
  }

  async exec(request: CodexExecRequest): Promise<CodexExecResponse> {
    if (!request.prompt?.trim()) {
      throw new Error('Codex prompt is required');
    }

    await this.ensureCodexHome();

    const status = await this.getStatus();
    if (!status.installed) {
      throw new Error('Codex CLI is not installed');
    }

    if (!status.authenticated) {
      throw new Error('Codex is not signed in');
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bytebot-codex-'));
    const outputPath = path.join(tempDir, 'last-message.txt');
    let schemaPath: string | undefined;

    try {
      const args = [
        '-a',
        'never',
        'exec',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--ephemeral',
        '--output-last-message',
        outputPath,
      ];

      if (request.model?.trim()) {
        args.push('--model', request.model.trim());
      }

      if (request.outputSchema) {
        schemaPath = path.join(tempDir, 'output-schema.json');
        await fs.writeFile(
          schemaPath,
          JSON.stringify(request.outputSchema, null, 2),
          { mode: 0o600 },
        );
        args.push('--output-schema', schemaPath);
      }

      const imagePaths = await this.writeExecImages(tempDir, request.images);
      for (const imagePath of imagePaths) {
        args.push('--image', imagePath);
      }

      args.push('-');

      const result = await this.runCodex(args, {
        stdin: request.prompt,
        timeoutMs: Number(process.env.CODEX_EXEC_TIMEOUT_MS || 600000),
      });

      const output = (await fs.readFile(outputPath, 'utf8')).trim();

      return {
        output,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async getCodexVersion(): Promise<string | undefined> {
    try {
      const result = await this.runCodex(['--version'], { timeoutMs: 10000 });
      return result.stdout.trim() || result.stderr.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  private appendLoginOutput(output: string) {
    if (!this.activeLogin) {
      return;
    }

    const cleanOutput = this.stripAnsi(output).replace(/\r\n?/g, '\n');

    this.activeLogin.output = `${this.activeLogin.output}${cleanOutput}`.slice(
      -20000,
    );
    this.updateDeviceLoginDetails(this.activeLogin);
  }

  private updateDeviceLoginDetails(session: CodexLoginSession) {
    const verificationUri = session.output.match(
      /https:\/\/auth\.openai\.com\/codex\/device/i,
    )?.[0];
    const codeFromInstruction = session.output.match(
      /Enter this one-time code[\s\S]*?\n\s*([A-Z0-9]{4,}-[A-Z0-9]{4,})/i,
    )?.[1];
    const codeFromOutput = session.output.match(
      /\b([A-Z0-9]{4,}-[A-Z0-9]{4,})\b/,
    )?.[1];

    if (verificationUri) {
      session.verificationUri = verificationUri;
    }

    const userCode = codeFromInstruction || codeFromOutput;
    if (userCode) {
      session.userCode = userCode.toUpperCase();
    }
  }

  private stripAnsi(value: string): string {
    return value.replace(
      // Strip ANSI escape/control sequences from Codex CLI output.
      /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
      '',
    );
  }

  private async ensureCodexHome() {
    await fs.mkdir(this.codexHome, { recursive: true });
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async hasUsableAuthFile(): Promise<boolean> {
    try {
      const rawAuth = await fs.readFile(this.authFilePath, 'utf8');
      const auth = JSON.parse(rawAuth) as {
        OPENAI_API_KEY?: string | null;
        tokens?: {
          access_token?: string | null;
          refresh_token?: string | null;
        };
      };

      return Boolean(
        auth.OPENAI_API_KEY ||
          auth.tokens?.access_token ||
          auth.tokens?.refresh_token,
      );
    } catch {
      return false;
    }
  }

  private async writeExecImages(
    tempDir: string,
    images: CodexExecImage[] = [],
  ): Promise<string[]> {
    const imagePaths: string[] = [];

    for (const [index, image] of images.entries()) {
      if (!image.data) {
        continue;
      }

      const extension = this.imageExtension(image.mediaType);
      const safeName = (image.name || `image-${index + 1}`)
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/\.+/g, '.');
      const filePath = path.join(tempDir, `${safeName}.${extension}`);

      await fs.writeFile(filePath, Buffer.from(image.data, 'base64'), {
        mode: 0o600,
      });
      imagePaths.push(filePath);
    }

    return imagePaths;
  }

  private imageExtension(mediaType?: string): string {
    switch (mediaType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'image/png':
      default:
        return 'png';
    }
  }

  private runCodex(
    args: string[],
    options: { stdin?: string; timeoutMs?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('codex', this.withFileCredentialStore(args), {
        env: this.commandEnv(),
        cwd: this.homeDir,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Codex command timed out'));
      }, options.timeoutMs ?? 30000);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || 'Codex failed'));
        }
      });

      if (options.stdin) {
        child.stdin.write(options.stdin);
      }
      child.stdin.end();
    });
  }

  private withFileCredentialStore(args: string[]): string[] {
    return ['-c', 'cli_auth_credentials_store="file"', ...args];
  }

  private commandEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      HOME: this.homeDir,
      USER: process.env.USER || 'user',
      LOGNAME: process.env.LOGNAME || 'user',
      CODEX_HOME: this.codexHome,
      DISPLAY: process.env.DISPLAY || ':0',
      PATH: [
        '/home/user/.local/bin',
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        process.env.PATH || '',
      ].join(':'),
    };
  }
}
