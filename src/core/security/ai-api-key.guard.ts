import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class AiApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const configuredKey = process.env.AI_CORE_API_KEY;
    const header = request.headers['x-ai-core-key'];
    const providedKey = Array.isArray(header) ? header[0] : header;

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
