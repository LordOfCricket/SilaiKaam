import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Uses `jose` (not `jsonwebtoken`) because it runs on both Node and the
// Edge runtime, so the same helper could be reused by Next.js middleware
// if signature verification is ever needed there.

export interface SessionTokenClaims extends JWTPayload {
  sub: string;
  email: string;
  role: string;
}

export async function signSessionToken(
  claims: SessionTokenClaims,
  secret: string,
  expiresIn: string,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionTokenClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as SessionTokenClaims;
}
