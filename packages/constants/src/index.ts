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

/** httpOnly session cookie set by the API Gateway on login/register. Shared
 * so the web app's middleware can check for its presence without needing
 * the JWT secret (which stays backend-only). */
export const AUTH_COOKIE_NAME = 'sk_session';
