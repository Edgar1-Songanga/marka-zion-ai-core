export type ProductSpaceId = string;

export interface ProductSpace {
  readonly id: ProductSpaceId;
  readonly displayName: string;
  readonly status: 'ACTIVE' | 'SUSPENDED';
  readonly capabilities: readonly string[];
}

export interface SpaceRequestContext {
  readonly spaceId: ProductSpaceId;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly roles: readonly string[];
}
