export type AiAccessLevel = 'STANDARD' | 'OWNER';

export interface AiAuthenticatedContext {
  readonly space: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly roles: readonly string[];
  readonly accessLevel: AiAccessLevel;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly issuer: string;
}
