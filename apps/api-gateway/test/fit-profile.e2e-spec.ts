import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { FitProfileModule } from '../src/modules/fit-profile/fit-profile.module';

describe('FitProfile (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), FitProfileModule],
    })
      .overrideProvider(DownstreamHttpService)
      .useValue(downstream)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    tokenService = moduleFixture.get(TokenService);
    await app.init();
  });

  afterEach(() => downstream.request.mockReset());
  afterAll(() => app.close());

  async function customerCookie() {
    const token = await tokenService.issue({
      id: 'user-1',
      email: 'jane@example.com',
      role: 'CUSTOMER',
    });
    return [`${AUTH_COOKIE_NAME}=${token}`];
  }

  it('rejects an unauthenticated request', async () => {
    const response = await request(app.getHttpServer()).get('/fit-profile');
    expect(response.status).toBe(401);
  });

  it('returns an empty response when the customer has no fit profile yet', async () => {
    // Nest sends an empty body (no `application/json` content-type) for a
    // `null`/`undefined` return value rather than the literal JSON "null" —
    // the frontend already treats a falsy/empty payload as "no profile".
    downstream.request.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get('/fit-profile')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.text).toBe('');
  });

  it('rejects invalid measurement values before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .put('/fit-profile')
      .set('Cookie', await customerCookie())
      .send({
        label: 'My Fit',
        fitPreference: 'REGULAR',
        measurements: [{ key: 'CHEST', value: -5 }],
      });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('rejects a non-customer role', async () => {
    const token = await tokenService.issue({
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'STAFF',
    });
    const response = await request(app.getHttpServer())
      .get('/fit-profile')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('saves a valid fit profile', async () => {
    downstream.request.mockResolvedValue({
      id: 'fp-1',
      label: 'My Fit',
      fitPreference: 'REGULAR',
      notes: null,
      measurements: [{ key: 'CHEST', value: 40, unit: 'in' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await request(app.getHttpServer())
      .put('/fit-profile')
      .set('Cookie', await customerCookie())
      .send({
        label: 'My Fit',
        fitPreference: 'REGULAR',
        measurements: [{ key: 'CHEST', value: 40 }],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ label: 'My Fit' });
  });
});
