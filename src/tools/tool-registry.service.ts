import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiSpace } from '../core/contracts/ai.types';
import { AiToolContext, AiToolDefinition } from './tool.types';

@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, AiToolDefinition>();

  register<TInput, TOutput>(tool: AiToolDefinition<TInput, TOutput>): void {
    this.tools.set(tool.name, tool as AiToolDefinition);
  }

  async execute(
    name: string,
    input: unknown,
    context: AiToolContext,
  ): Promise<unknown> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new NotFoundException(`AI tool not found: ${name}`);
    }

    if (!tool.spaces.includes(context.space)) {
      throw new ForbiddenException('Tool is not available in this AI space');
    }

    if (tool.permission === 'SENSITIVE_WRITE' && !context.roles.includes('ai:sensitive-write')) {
      throw new ForbiddenException('Sensitive AI tool permission required');
    }

    return tool.execute(input, context);
  }

  list(space: AiSpace): readonly string[] {
    return [...this.tools.values()]
      .filter((tool) => tool.spaces.includes(space))
      .map((tool) => tool.name);
  }
}
