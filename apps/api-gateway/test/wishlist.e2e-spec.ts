import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { WishlistModule } from '../src/modules/wishlist/wishlist.module';

describe('Wishlist (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), WishlistModule],
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
    const response = await request(app.getHttpServer()).get('/wishlist');
    expect(response.status).toBe(401);
  });

  it('lists the wishlist', async () => {
    downstream.request.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get('/wishlist').set('Cookie', await customerCookie());
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('rejects an invalid save payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/wishlist/items')
      .set('Cookie', await customerCookie())
      .send({ productId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('saves a product', async () => {
    downstream.request.mockResolvedValue({ id: 'wish-1', productId: randomUUID() });
    const response = await request(app.getHttpServer())
      .post('/wishlist/items')
      .set('Cookie', await customerCookie())
      .send({ productId: randomUUID() });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('wish-1');
  });

  it('removes a saved product', async () => {
    downstream.request.mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .delete(`/wishlist/items/${randomUUID()}`)
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(204);
  });
});
