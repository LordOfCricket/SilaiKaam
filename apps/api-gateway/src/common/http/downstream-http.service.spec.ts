import { ServiceUnavailableException } from '@nestjs/common';
import { DownstreamHttpService } from './downstream-http.service';

describe('DownstreamHttpService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the parsed JSON body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const service = new DownstreamHttpService();
    const result = await service.request({ method: 'GET', url: 'http://svc/x' });

    expect(result).toEqual({ id: '1' });
  });

  it('propagates the downstream error body and status', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'EMAIL_ALREADY_REGISTERED', message: 'taken' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const service = new DownstreamHttpService();

    await expect(service.request({ method: 'POST', url: 'http://svc/x' })).rejects.toMatchObject({
      status: 409,
      response: { code: 'EMAIL_ALREADY_REGISTERED', message: 'taken' },
    });
  });

  it('turns a connection failure into a 503', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const service = new DownstreamHttpService();

    await expect(service.request({ method: 'GET', url: 'http://svc/x' })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
