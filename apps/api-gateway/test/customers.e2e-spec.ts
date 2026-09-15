import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { CustomersModule } from '../src/modules/customers/customers.module';

describe('Customers (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), CustomersModule],
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

  afterEach(() => {
    downstream.request.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app.getHttpServer()).get('/customers/me');
    expect(response.status).toBe(401);
  });

  it('returns the profile for an authenticated customer', async () => {
    downstream.request.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      fullName: 'Jane Doe',
      phone: null,
      dateOfBirth: null,
      gender: null,
      avatarUrl: null,
      addresses: [],
    });
    const token = await tokenService.issue({
      id: 'user-1',
      email: 'jane@example.com',
      role: 'CUSTOMER',
    });

    const response = await request(app.getHttpServer())
      .get('/customers/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ fullName: 'Jane Doe', email: 'jane@example.com' });
  });

  it('rejects a non-customer role from reaching customer-only routes', async () => {
    const token = await tokenService.issue({
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'STAFF',
    });

    const response = await request(app.getHttpServer())
      .get('/customers/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('rejects an expired/invalid session token', async () => {
    const response = await request(app.getHttpServer())
      .get('/customers/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=not-a-real-token`]);

    expect(response.status).toBe(401);
  });
});
