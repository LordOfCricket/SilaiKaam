const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses simple durations like "7d", "12h", "30m", "45s" (as used for
 * JWT_EXPIRES_IN) into milliseconds. Falls back to `fallbackMs` if the
 * input doesn't match. */
export function parseDurationToMs(input: string, fallbackMs: number): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match || !match[1] || !match[2]) return fallbackMs;
  const amount = Number(match[1]);
  const unitMs = UNIT_TO_MS[match[2].toLowerCase()];
  return unitMs ? amount * unitMs : fallbackMs;
}
