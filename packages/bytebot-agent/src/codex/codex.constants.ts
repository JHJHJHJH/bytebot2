import { BytebotAgentModel } from '../agent/agent.types';

export const CODEX_MODELS: BytebotAgentModel[] = [
  {
    provider: 'codex',
    name: 'gpt-5.5',
    title: 'Codex GPT-5.5',
    contextWindow: 1000000,
  },
  {
    provider: 'codex',
    name: 'gpt-5.4',
    title: 'Codex GPT-5.4',
    contextWindow: 1000000,
  },
];

export const DEFAULT_MODEL = CODEX_MODELS[0];
