import type { ConfigService } from '@nestjs/config';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import type { GatewayEnv } from '../../config/configuration';
import { AuthService } from './auth.service';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildConfig(): ConfigService<GatewayEnv, true> {
  const values: Record<string, string> = {
    IDENTITY_SERVICE_URL: 'http://identity',
    USER_SERVICE_URL: 'http://user',
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<GatewayEnv, true>;
}

describe('AuthService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('registers a customer by creating the identity record then the profile', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER', isActive: true },
          201,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ id: 'profile-1' }, 201));
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new AuthService(new DownstreamHttpService(), buildConfig());
    const result = await service.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
    });

    expect(result).toEqual({ id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('http://identity/internal/auth/register');
    expect(fetchMock.mock.calls[1][0]).toBe('http://user/internal/customers');
  });

  it('propagates a duplicate-email conflict from identity-service', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ code: 'EMAIL_ALREADY_REGISTERED', message: 'taken' }, 409),
      ) as unknown as typeof fetch;

    const service = new AuthService(new DownstreamHttpService(), buildConfig());

    await expect(
      service.register({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rolls back the identity record if profile creation fails', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER', isActive: true },
          201,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ code: 'INTERNAL', message: 'boom' }, 500))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new AuthService(new DownstreamHttpService(), buildConfig());

    await expect(
      service.register({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Passw0rd!',
        confirmPassword: 'Passw0rd!',
      }),
    ).rejects.toMatchObject({ status: 500 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('http://identity/internal/auth/users/user-1');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
  });

  it('returns the sanitized user on successful login', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER', isActive: true },
          200,
        ),
      ) as unknown as typeof fetch;

    const service = new AuthService(new DownstreamHttpService(), buildConfig());
    const result = await service.login({ email: 'jane@example.com', password: 'Passw0rd!' });

    expect(result).toEqual({ id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER' });
  });

  it('propagates invalid-credentials rejection from identity-service', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ code: 'INVALID_CREDENTIALS', message: 'nope' }, 401),
      ) as unknown as typeof fetch;

    const service = new AuthService(new DownstreamHttpService(), buildConfig());

    await expect(
      service.login({ email: 'jane@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });
});
