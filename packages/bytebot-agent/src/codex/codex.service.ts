import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Message, Role } from '@prisma/client';
import {
  ImageContentBlock,
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
} from '@bytebot/shared';
import {
  BytebotAgentResponse,
  BytebotAgentService,
} from '../agent/agent.types';
import { agentTools } from '../agent/agent.tools';
import { DEFAULT_MODEL } from './codex.constants';

interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
}

interface CodexExecImage {
  name: string;
  data: string;
  mediaType: string;
}

interface CodexExecResponse {
  output: string;
  stdout: string;
  stderr: string;
}

interface CodexStructuredResponse {
  contentBlocks: CodexStructuredBlock[];
}

interface CodexStructuredBlock {
  type: 'text' | 'tool_use';
  text: string;
  id: string;
  name: string;
  inputJson: string;
}

const CODEX_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    contentBlocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['text', 'tool_use'] },
          text: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          inputJson: { type: 'string' },
        },
        required: ['type', 'text', 'id', 'name', 'inputJson'],
        additionalProperties: false,
      },
    },
  },
  required: ['contentBlocks'],
  additionalProperties: false,
};

@Injectable()
export class CodexService implements BytebotAgentService {
  private readonly logger = new Logger(CodexService.name);

  constructor(private readonly configService: ConfigService) {}

  async isConfigured(): Promise<boolean> {
    try {
      const status = await this.desktopRequest<CodexStatus>('/codex/status', {
        signal: AbortSignal.timeout(3000),
      });
      return Boolean(status.installed && status.authenticated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Codex status unavailable: ${message}`);
      return false;
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    const images: CodexExecImage[] = [];
    const prompt = this.buildPrompt(systemPrompt, messages, useTools, images);
    const response = await this.desktopRequest<CodexExecResponse>(
      '/codex/exec',
      {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          model,
          outputSchema: CODEX_OUTPUT_SCHEMA,
          images,
        }),
        signal,
      },
    );

    return {
      contentBlocks: this.parseCodexOutput(response.output),
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    };
  }

  private buildPrompt(
    systemPrompt: string,
    messages: Message[],
    useTools: boolean,
    images: CodexExecImage[],
  ): string {
    const toolInstructions = useTools
      ? [
          'You must operate Bytebot by returning Bytebot content blocks, not by using shell commands.',
          'When an action is needed, return a tool_use block with a Bytebot tool name and inputJson.',
          'Use computer_screenshot before acting when you need visual state.',
          'Always finish successful work with set_task_status using status "completed".',
          'If you cannot proceed, use set_task_status with status "needs_help".',
          'Available Bytebot tools:',
          JSON.stringify(agentTools, null, 2),
        ].join('\n')
      : 'Tool use is disabled. Return one text block only.';

    const formattedMessages = messages
      .map((message, index) => this.formatMessage(message, index + 1, images))
      .join('\n\n');

    return [
      'You are acting as the model backend for Bytebot.',
      '',
      'SYSTEM PROMPT',
      systemPrompt,
      '',
      'RESPONSE CONTRACT',
      'Return only JSON matching the provided schema.',
      'For text blocks: type="text", put content in text, and set id/name/inputJson to empty strings or "{}" for inputJson.',
      'For tool_use blocks: type="tool_use", set name to the exact Bytebot tool name, set id to a unique id, leave text empty, and set inputJson to a JSON object string.',
      toolInstructions,
      '',
      'CONVERSATION',
      formattedMessages || '(no prior messages)',
    ].join('\n');
  }

  private formatMessage(
    message: Message,
    index: number,
    images: CodexExecImage[],
  ): string {
    const role = message.role === Role.USER ? 'USER' : 'ASSISTANT';
    const blocks = message.content as MessageContentBlock[];
    const formattedBlocks = blocks
      .map((block) => this.formatContentBlock(block, images))
      .join('\n');

    return `Message ${index} (${role})\n${formattedBlocks}`;
  }

  private formatContentBlock(
    block: MessageContentBlock,
    images: CodexExecImage[],
  ): string {
    switch (block.type) {
      case MessageContentType.Text:
        return `Text: ${(block as TextContentBlock).text}`;
      case MessageContentType.Image:
        return this.attachImage(block as ImageContentBlock, images);
      case MessageContentType.Document:
        return `Document: ${JSON.stringify({
          name: block.name,
          media_type: block.source.media_type,
          size: block.size,
        })}`;
      case MessageContentType.ToolUse:
        return `Assistant tool_use: ${JSON.stringify({
          id: block.id,
          name: block.name,
          input: block.input,
        })}`;
      case MessageContentType.ToolResult:
        return [
          `Tool result for ${block.tool_use_id}${block.is_error ? ' (error)' : ''}:`,
          ...block.content.map((contentBlock) =>
            this.formatContentBlock(contentBlock, images),
          ),
        ].join('\n');
      case MessageContentType.UserAction:
        return [
          'User action:',
          ...block.content.map((contentBlock) =>
            this.formatContentBlock(contentBlock, images),
          ),
        ].join('\n');
      case MessageContentType.Thinking:
      case MessageContentType.RedactedThinking:
        return `[${block.type} omitted]`;
      default:
        return JSON.stringify(block);
    }
  }

  private attachImage(
    block: ImageContentBlock,
    images: CodexExecImage[],
  ): string {
    const name = `bytebot-image-${images.length + 1}`;
    images.push({
      name,
      data: block.source.data,
      mediaType: block.source.media_type,
    });

    return `Image attachment: ${name}.png`;
  }

  private parseCodexOutput(output: string): MessageContentBlock[] {
    const parsed = JSON.parse(output) as CodexStructuredResponse;
    const contentBlocks = parsed.contentBlocks
      .map((block) => this.toMessageContentBlock(block))
      .filter((block): block is MessageContentBlock => Boolean(block));

    if (contentBlocks.length === 0) {
      throw new Error('Codex returned no content blocks');
    }

    return contentBlocks;
  }

  private toMessageContentBlock(
    block: CodexStructuredBlock,
  ): MessageContentBlock | null {
    if (block.type === 'text') {
      if (!block.text.trim()) {
        return null;
      }

      return {
        type: MessageContentType.Text,
        text: block.text,
      } as TextContentBlock;
    }

    if (block.type === 'tool_use') {
      if (!block.name.trim()) {
        return null;
      }

      return {
        type: MessageContentType.ToolUse,
        id: block.id.trim() || randomUUID(),
        name: block.name.trim(),
        input: this.parseInputJson(block.inputJson),
      } as ToolUseContentBlock;
    }

    return null;
  }

  private parseInputJson(inputJson: string): Record<string, unknown> {
    if (!inputJson.trim()) {
      return {};
    }

    const parsed = JSON.parse(inputJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Codex tool inputJson must be a JSON object');
    }

    return parsed as Record<string, unknown>;
  }

  private async desktopRequest<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const baseUrl = this.configService.get<string>('BYTEBOT_DESKTOP_BASE_URL');
    if (!baseUrl) {
      throw new Error('BYTEBOT_DESKTOP_BASE_URL is not configured');
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Desktop request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
