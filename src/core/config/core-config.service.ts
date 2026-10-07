import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  get serviceName(): string {
    return process.env.SERVICE_NAME ?? 'marka-zion-ai-core';
  }

  get requestTimeoutMs(): number {
    const value = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);
    return Number.isFinite(value) && value > 0 ? value : 30000;
  }

  get maxInputCharacters(): number {
    const value = Number(process.env.AI_MAX_INPUT_CHARACTERS ?? 20000);
    return Number.isFinite(value) && value > 0 ? value : 20000;
  }

  get maxToolOutputCharacters(): number {
    const value = Number(process.env.AI_MAX_TOOL_OUTPUT_CHARACTERS ?? 50000);
    return Number.isFinite(value) && value > 0 ? value : 50000;
  }

  get maxGroundingCharacters(): number {
    const value = Number(process.env.AI_MAX_GROUNDING_CHARACTERS ?? 30000);
    return Number.isFinite(value) && value > 0 ? value : 30000;
  }
}
