import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { CartModule } from '../src/modules/cart/cart.module';

describe('Cart (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), CartModule],
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
    const response = await request(app.getHttpServer()).get('/cart');
    expect(response.status).toBe(401);
  });

  it('rejects a non-customer role', async () => {
    const token = await tokenService.issue({
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'STAFF',
    });
    const response = await request(app.getHttpServer())
      .get('/cart')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('returns an empty cart', async () => {
    downstream.request.mockResolvedValue({
      items: [],
      productSubtotal: 0,
      fittingSubtotal: 0,
      hasUnpricedItems: false,
      estimatedTotal: 0,
    });
    const response = await request(app.getHttpServer())
      .get('/cart')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('rejects an invalid add-item payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', await customerCookie())
      .send({ type: 'PRODUCT_ONLY' }); // missing productId/quantity

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('adds a valid PRODUCT_ONLY item', async () => {
    downstream.request.mockResolvedValue({ id: 'item-1', type: 'PRODUCT_ONLY' });
    const response = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', await customerCookie())
      .send({ type: 'PRODUCT_ONLY', productId: randomUUID(), quantity: 1 });

    expect(response.status).toBe(201);
  });

  it('removes an item', async () => {
    downstream.request.mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .delete('/cart/items/item-1')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(204);
  });
});
