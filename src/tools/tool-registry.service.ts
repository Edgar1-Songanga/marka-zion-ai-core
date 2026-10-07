import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiSpace } from '../core/contracts/ai.types';
import { AiToolContext, AiToolDefinition } from './tool.types';

@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, AiToolDefinition>();

  register<TInput, TOutput>(tool: AiToolDefinition<TInput, TOutput>): void {
    const name = tool.name.trim();

    if (!name || name.length > 128) {
      throw new Error('AI tool name must contain 1-128 characters');
    }

    if (tool.spaces.length === 0) {
      throw new Error('AI tool must declare at least one AI space');
    }

    if (this.tools.has(name)) {
      throw new Error(`AI tool already registered: ${name}`);
    }

    this.tools.set(name, {
      ...tool,
      name,
    } as AiToolDefinition);
  }

  get(name: string): AiToolDefinition {
    const tool = this.tools.get(name.trim());

    if (!tool) {
      throw new NotFoundException(`AI tool not found: ${name}`);
    }

    return tool;
  }

  authorize(
    name: string,
    context: AiToolContext,
    allowApprovedSensitive = false,
  ): AiToolDefinition {
    const tool = this.get(name);

    if (!tool.spaces.includes(context.space)) {
      throw new ForbiddenException('Tool is not available in this AI space');
    }

    if (tool.permission === 'SENSITIVE_WRITE' && !allowApprovedSensitive) {
      throw new ForbiddenException('Sensitive AI tool execution requires approval');
    }

    if (
      tool.permission === 'WRITE' &&
      !context.roles.includes('ai:write')
    ) {
      throw new ForbiddenException('AI write permission required');
    }

    if (tool.permission !== 'READ' && !context.userId) {
      throw new ForbiddenException(
        'User context required for write-capable AI tools',
      );
    }

    if (tool.permission !== 'READ' && !context.tenantId) {
      throw new ForbiddenException(
        'Tenant context required for write-capable AI tools',
      );
    }

    return tool;
  }

  list(space: AiSpace): readonly string[] {
    return [...this.tools.values()]
      .filter((tool) => tool.spaces.includes(space))
      .map((tool) => tool.name);
  }
}
