// Shared, domain-agnostic constants.
// Business/domain constants are intentionally NOT defined yet.

export const HTTP_HEADERS = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
} as const;

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
