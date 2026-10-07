import { Injectable, NotFoundException } from '@nestjs/common';

export interface JobHandler {
  readonly type: string;
  handle(payload: unknown): Promise<void>;
}

@Injectable()
export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(handler: JobHandler): void {
    if (!handler.type.trim()) {
      throw new Error('Job handler type is required');
    }

    if (this.handlers.has(handler.type)) {
      throw new Error(`Job handler already registered: ${handler.type}`);
    }

    this.handlers.set(handler.type, handler);
  }

  resolve(type: string): JobHandler {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new NotFoundException(`Job handler not found: ${type}`);
    }

    return handler;
  }
}
