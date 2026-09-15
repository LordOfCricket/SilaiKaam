import { HttpException, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { OrdersModule } from '../src/modules/orders/orders.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), OrdersModule],
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
    const response = await request(app.getHttpServer()).get('/orders');
    expect(response.status).toBe(401);
  });

  it('rejects a non-customer role', async () => {
    const token = await tokenService.issue({ id: 'staff-1', email: 'staff@example.com', role: 'STAFF' });
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(response.status).toBe(403);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('rejects an invalid place-order payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Cookie', await customerCookie())
      .send({ addressId: 'not-a-uuid', idempotencyKey: randomUUID() });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('places an order with a valid payload', async () => {
    downstream.request.mockResolvedValue({
      order: { id: 'order-1', status: 'PLACED', items: [] },
      created: true,
    });
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Cookie', await customerCookie())
      .send({ addressId: randomUUID(), idempotencyKey: randomUUID() });

    expect(response.status).toBe(201);
    expect(response.body.order.id).toBe('order-1');
  });

  it('lists orders', async () => {
    downstream.request.mockResolvedValue([{ id: 'order-1', status: 'PLACED' }]);
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('fetches an order by id', async () => {
    downstream.request.mockResolvedValue({ id: 'order-1', status: 'PLACED' });
    const response = await request(app.getHttpServer())
      .get('/orders/order-1')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('order-1');
  });

  it('propagates a downstream cart-needs-update rejection', async () => {
    downstream.request.mockImplementation(() => {
      throw new HttpException(
        { code: 'CART_NEEDS_UPDATE', message: 'Your cart needs to be updated before checkout.' },
        400,
      );
    });

    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Cookie', await customerCookie())
      .send({ addressId: randomUUID(), idempotencyKey: randomUUID() });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('CART_NEEDS_UPDATE');
  });

  it('rejects an invalid action-request response payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/action-requests/ar-1/respond')
      .set('Cookie', await customerCookie())
      .send({ responseText: '' });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('submits a valid action-request response', async () => {
    downstream.request.mockResolvedValue({ status: 'SUBMITTED', message: 'Thanks!' });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/action-requests/ar-1/respond')
      .set('Cookie', await customerCookie())
      .send({ responseText: '24 inches' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('SUBMITTED');
  });

  it('rejects an invalid review payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/reviews')
      .set('Cookie', await customerCookie())
      .send({ orderItemId: randomUUID(), targetType: 'PRODUCT', rating: 6 });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('submits a valid review', async () => {
    downstream.request.mockResolvedValue({ id: 'review-1', rating: 5, targetType: 'PRODUCT' });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/reviews')
      .set('Cookie', await customerCookie())
      .send({ orderItemId: randomUUID(), targetType: 'PRODUCT', rating: 5 });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('review-1');
  });

  it('lists reviews for an order', async () => {
    downstream.request.mockResolvedValue([{ id: 'review-1', rating: 5 }]);
    const response = await request(app.getHttpServer())
      .get('/orders/order-1/reviews')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('triggers a reorder', async () => {
    downstream.request.mockResolvedValue({ kind: 'ADDED_TO_CART' });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/items/item-1/reorder')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(201);
    expect(response.body.kind).toBe('ADDED_TO_CART');
  });

  it('propagates a downstream order-not-completed rejection for reorder', async () => {
    downstream.request.mockImplementation(() => {
      throw new HttpException({ code: 'ORDER_NOT_COMPLETED', message: 'Not completed yet.' }, 400);
    });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/items/item-1/reorder')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ORDER_NOT_COMPLETED');
  });

  it('rejects an invalid cancellation payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/cancel')
      .set('Cookie', await customerCookie())
      .send({ reason: 'NOT_A_REAL_REASON' });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('cancels an order', async () => {
    downstream.request.mockResolvedValue({
      cancellation: { id: 'cancel-1', orderId: 'order-1', reason: 'CUSTOMER_CHANGED_MIND', note: null, createdAt: new Date().toISOString() },
      refundCreated: true,
    });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/cancel')
      .set('Cookie', await customerCookie())
      .send({ reason: 'CUSTOMER_CHANGED_MIND' });

    expect(response.status).toBe(201);
    expect(response.body.refundCreated).toBe(true);
  });

  it('propagates a downstream order-not-cancellable rejection', async () => {
    downstream.request.mockImplementation(() => {
      throw new HttpException({ code: 'ORDER_NOT_CANCELLABLE', message: 'This order can no longer be cancelled online.' }, 400);
    });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/cancel')
      .set('Cookie', await customerCookie())
      .send({ reason: 'OTHER' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('lists refunds for an order', async () => {
    downstream.request.mockResolvedValue([{ id: 'refund-1', status: 'PENDING', amount: 1000 }]);
    const response = await request(app.getHttpServer())
      .get('/orders/order-1/refunds')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body[0].status).toBe('PENDING');
  });

  it('rejects an invalid dispute payload before calling the downstream service', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/disputes')
      .set('Cookie', await customerCookie())
      .send({ type: 'NOT_A_TYPE', description: 'short' });

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('creates a dispute', async () => {
    downstream.request.mockResolvedValue({ id: 'dispute-1', status: 'OPEN', type: 'QUALITY_ISSUE' });
    const response = await request(app.getHttpServer())
      .post('/orders/order-1/disputes')
      .set('Cookie', await customerCookie())
      .send({ type: 'QUALITY_ISSUE', description: 'The stitching came apart after one wash.' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('OPEN');
  });

  it('lists disputes for an order', async () => {
    downstream.request.mockResolvedValue([{ id: 'dispute-1', status: 'OPEN' }]);
    const response = await request(app.getHttpServer())
      .get('/orders/order-1/disputes')
      .set('Cookie', await customerCookie());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });
});
