// Shared, domain-agnostic TypeScript types, plus the identity/customer
// domain types introduced for the customer registration/login/profile flow.

export * from './auth';
export * from './customer';
export * from './fit-profile';
export * from './catalog';
export * from './fitting-request';
export * from './cart';
export * from './order';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
