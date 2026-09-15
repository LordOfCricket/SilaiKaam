// Generic, domain-agnostic technical utilities.
// Business logic must NOT live here.

export * from './jwt';
export * from './duration';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
