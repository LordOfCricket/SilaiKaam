import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { MarketplaceModule } from '../src/modules/marketplace/marketplace.module';

describe('Marketplace (e2e)', () => {
  let app: INestApplication;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), MarketplaceModule],
    })
      .overrideProvider(DownstreamHttpService)
      .useValue(downstream)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(() => downstream.request.mockReset());
  afterAll(() => app.close());

  it('allows a guest (no cookie) to list categories', async () => {
    downstream.request.mockResolvedValue([{ id: 'c1', name: 'Shirts', slug: 'shirts' }]);
    const response = await request(app.getHttpServer()).get('/marketplace/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'c1', name: 'Shirts', slug: 'shirts' }]);
  });

  it('allows a guest to list products with an empty catalog', async () => {
    downstream.request.mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 });
    const response = await request(app.getHttpServer()).get('/marketplace/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], total: 0, page: 1, limit: 12 });
  });

  it('forwards search/filter/sort query params to the catalog service', async () => {
    downstream.request.mockResolvedValue({ items: [], total: 0, page: 1, limit: 12 });
    await request(app.getHttpServer()).get(
      '/marketplace/products?q=shirt&sort=price_asc&category=shirts',
    );

    const calledUrl = downstream.request.mock.calls[0][0].url as string;
    expect(calledUrl).toContain('q=shirt');
    expect(calledUrl).toContain('sort=price_asc');
    expect(calledUrl).toContain('category=shirts');
  });

  it('rejects an invalid sort value', async () => {
    const response = await request(app.getHttpServer()).get('/marketplace/products?sort=bogus');
    expect(response.status).toBe(400);
  });

  it('propagates a 404 for an unknown product slug', async () => {
    const { HttpException } = await import('@nestjs/common');
    downstream.request.mockRejectedValue(
      new HttpException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' }, 404),
    );
    const response = await request(app.getHttpServer()).get('/marketplace/products/does-not-exist');

    expect(response.status).toBe(404);
  });

  it('allows a guest to see fitting services for an eligible product', async () => {
    downstream.request.mockResolvedValue([
      {
        id: 'fs1',
        type: 'SLEEVE_ALTERATION',
        name: 'Sleeve alteration',
        description: null,
        requiredMeasurements: ['SLEEVE'],
        basePrice: null,
      },
    ]);
    const response = await request(app.getHttpServer()).get(
      '/marketplace/products/cotton-shirt/fitting-services',
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ type: 'SLEEVE_ALTERATION', basePrice: null });
  });

  it('returns an empty fitting-services list for a non-eligible product', async () => {
    downstream.request.mockResolvedValue([]);
    const response = await request(app.getHttpServer()).get(
      '/marketplace/products/linen-shirt/fitting-services',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
