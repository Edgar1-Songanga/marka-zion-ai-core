import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AiAuthenticatedContext } from './ai-authenticated-context';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  aiContext?: AiAuthenticatedContext;
}

interface SignedContextPayload {
  readonly space: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly roles?: readonly string[];
  readonly iat: number;
  readonly exp: number;
  readonly iss: string;
  readonly aud?: string;
}

@Injectable()
export class AiApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    this.verifyApiKey(request);
    request.aiContext = this.verifyContext(request);

    return true;
  }

  private verifyApiKey(request: RequestLike): void {
    const configuredKey = process.env.AI_CORE_API_KEY;
    const header = request.headers['x-ai-core-key'];
    const providedKey = Array.isArray(header) ? header[0] : header;

    if (!configuredKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          'AI Core API authentication is not configured',
        );
      }

      return;
    }

    if (!providedKey) {
      throw new UnauthorizedException('AI Core API key is required');
    }

    const expected = Buffer.from(configuredKey);
    const actual = Buffer.from(providedKey);

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException('Invalid AI Core API key');
    }
  }

  private get allowedIssuers(): readonly string[] {
    return (process.env.AI_ALLOWED_CONTEXT_ISSUERS ?? '')
      .split(',')
      .map((issuer) => issuer.trim())
      .filter(Boolean);
  }

  private verifyContext(request: RequestLike): AiAuthenticatedContext {
    const tokenHeader = request.headers['x-ai-context-token'];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    const secret = process.env.AI_CONTEXT_SIGNING_SECRET;

    if (!token || !secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException(
          'Signed AI product context is required',
        );
      }

      return {
        space: '',
        tenantId: '',
        roles: [],
        issuedAt: 0,
        expiresAt: 0,
        issuer: 'development',
      };
    }

    const parts = token.split('.');

    if (parts.length !== 2) {
      throw new UnauthorizedException('Invalid AI context token');
    }

    const [encodedPayload, encodedSignature] = parts;
    const expectedSignature = createHmac('sha256', secret)
      .update(encodedPayload)
      .digest();

    let actualSignature: Buffer;

    try {
      actualSignature = Buffer.from(encodedSignature, 'base64url');
    } catch {
      throw new UnauthorizedException('Invalid AI context signature');
    }

    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      throw new UnauthorizedException('Invalid AI context signature');
    }

    let payload: SignedContextPayload;

    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as SignedContextPayload;
    } catch {
      throw new UnauthorizedException('Invalid AI context payload');
    }

    const now = Math.floor(Date.now() / 1000);

    const expectedAudience = process.env.AI_CONTEXT_AUDIENCE?.trim();

    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      typeof payload.space !== 'string' ||
      typeof payload.tenantId !== 'string' ||
      typeof payload.iss !== 'string' ||
      !payload.space.trim() ||
      !payload.tenantId.trim() ||
      !payload.iss.trim() ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.iat > now + 30 ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 300 ||
      (process.env.NODE_ENV === 'production' && !expectedAudience) ||
      (expectedAudience !== undefined && payload.aud !== expectedAudience) ||
      !this.allowedIssuers.includes(payload.iss)
    ) {
      throw new UnauthorizedException('Invalid or expired AI context');
    }
    const roles = payload.roles ?? [];

    if (
      !Array.isArray(roles) ||
      (payload.userId !== undefined && (typeof payload.userId !== 'string' || payload.userId.length > 128)) ||
      payload.space.length > 128 ||
      payload.tenantId.length > 128 ||
      roles.some(
        (role) => typeof role !== 'string' || role.length === 0 || role.length > 100,
      )
    ) {
      throw new UnauthorizedException('Invalid AI context roles');
    }

    return {
      space: payload.space,
      tenantId: payload.tenantId,
      userId: payload.userId,
      roles,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      issuer: payload.iss,
    };
  }
}
