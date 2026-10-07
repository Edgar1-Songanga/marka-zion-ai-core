import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

@Injectable()
export class AiApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredKey = process.env.AI_CORE_API_KEY;
    const providedKey = request.header('x-ai-core-key');

    if (!configuredKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('AI Core API authentication is not configured');
      }

      return true;
    }

    if (!providedKey) {
      throw new UnauthorizedException('AI Core API key is required');
    }

    const expected = Buffer.from(configuredKey);
    const actual = Buffer.from(providedKey);

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Invalid AI Core API key');
    }

    return true;
  }
}
