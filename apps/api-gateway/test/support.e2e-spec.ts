import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { SupportModule } from '../src/modules/support/support.module';

describe('Support (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), SupportModule],
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

  it('rejects an invalid ticket payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/support/tickets')
      .set('Cookie', await customerCookie())
      .send({ category: 'NOT_A_CATEGORY', subject: 'x', description: 'x' });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('creates a ticket', async () => {
    downstream.request.mockResolvedValue({ id: 'ticket-1', status: 'OPEN', messages: [] });
    const response = await request(app.getHttpServer())
      .post('/support/tickets')
      .set('Cookie', await customerCookie())
      .send({ category: 'ORDER', subject: 'Where is my order', description: 'It has not arrived after a week.' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('ticket-1');
  });

  it('lists tickets', async () => {
    downstream.request.mockResolvedValue([{ id: 'ticket-1', status: 'OPEN' }]);
    const response = await request(app.getHttpServer()).get('/support/tickets').set('Cookie', await customerCookie());
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('adds a message to a ticket', async () => {
    downstream.request.mockResolvedValue({ id: 'ticket-1', messages: [{ id: 'msg-1' }] });
    const response = await request(app.getHttpServer())
      .post(`/support/tickets/${randomUUID()}/messages`)
      .set('Cookie', await customerCookie())
      .send({ message: 'Any update?' });

    expect(response.status).toBe(201);
    expect(response.body.messages).toHaveLength(1);
  });

  it('closes a ticket', async () => {
    downstream.request.mockResolvedValue({ id: 'ticket-1', status: 'CLOSED' });
    const response = await request(app.getHttpServer())
      .post(`/support/tickets/${randomUUID()}/close`)
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CLOSED');
  });
});
