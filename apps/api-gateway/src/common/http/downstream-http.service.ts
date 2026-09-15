import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

export interface DownstreamRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Thin fetch wrapper for gateway -> internal-service calls. Maps a
 * downstream service's JSON error body straight through (so codes like
 * EMAIL_ALREADY_REGISTERED survive to the client), and turns connection
 * failures into a clear 503 instead of an unhandled exception. */
@Injectable()
export class DownstreamHttpService {
  private readonly logger = new Logger(DownstreamHttpService.name);

  async request<T>({ method, url, body, headers }: DownstreamRequest): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(
        `Downstream call failed: ${method} ${url}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'A required service is temporarily unavailable. Please try again.',
      });
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json().catch(() => undefined) : undefined;

    if (!response.ok) {
      const errorBody =
        payload && typeof payload === 'object' && 'message' in (payload as Record<string, unknown>)
          ? (payload as Record<string, unknown>)
          : { code: 'UPSTREAM_ERROR', message: 'The request could not be completed.' };
      throw new HttpException(errorBody, response.status || HttpStatus.BAD_GATEWAY);
    }

    return payload as T;
  }
}
