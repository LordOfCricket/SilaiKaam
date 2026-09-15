import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), NotificationsModule],
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
    const token = await tokenService.issue({ id: 'user-1', email: 'jane@example.com', role: 'CUSTOMER' });
    return [`${AUTH_COOKIE_NAME}=${token}`];
  }

  it('rejects an unauthenticated request', async () => {
    const response = await request(app.getHttpServer()).get('/notifications');
    expect(response.status).toBe(401);
  });

  it('lists notifications', async () => {
    downstream.request.mockResolvedValue({ items: [], unreadCount: 0, total: 0 });
    const response = await request(app.getHttpServer()).get('/notifications').set('Cookie', await customerCookie());
    expect(response.status).toBe(200);
    expect(response.body.unreadCount).toBe(0);
  });

  it('marks a notification read', async () => {
    downstream.request.mockResolvedValue({ id: 'notif-1', isRead: true });
    const response = await request(app.getHttpServer())
      .post(`/notifications/${randomUUID()}/read`)
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(201);
    expect(response.body.isRead).toBe(true);
  });

  it('marks all notifications read', async () => {
    downstream.request.mockResolvedValue({ updated: 3 });
    const response = await request(app.getHttpServer())
      .post('/notifications/read-all')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(201);
    expect(response.body.updated).toBe(3);
  });
});
