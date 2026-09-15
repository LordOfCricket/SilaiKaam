import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME } from '@silaikaam/constants';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { TokenService } from '../src/common/auth/token.service';
import { DownstreamHttpService } from '../src/common/http/downstream-http.service';
import { ExistingGarmentModule } from '../src/modules/existing-garment/existing-garment.module';
import { CustomStitchingModule } from '../src/modules/custom-stitching/custom-stitching.module';

describe('Existing Garment / Custom Stitching (e2e)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  const downstream = { request: jest.fn() };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-at-least-32-characters-long';
    process.env.JWT_EXPIRES_IN = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ExistingGarmentModule,
        CustomStitchingModule,
      ],
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

  it('rejects an unauthenticated existing-garment request', async () => {
    const response = await request(app.getHttpServer()).post('/existing-garment/requests').send({});
    expect(response.status).toBe(401);
  });

  it('rejects an existing-garment request missing required fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/existing-garment/requests')
      .set('Cookie', await customerCookie())
      .send({ garmentType: 'Shirt' }); // missing condition, services, photos

    expect(response.status).toBe(400);
    expect(downstream.request).not.toHaveBeenCalled();
  });

  it('accepts a valid existing-garment request', async () => {
    downstream.request.mockResolvedValue({ id: 'egr-1', garmentType: 'Shirt', photos: [] });
    const response = await request(app.getHttpServer())
      .post('/existing-garment/requests')
      .set('Cookie', await customerCookie())
      .send({
        garmentType: 'Shirt',
        condition: 'GOOD',
        selectedFittingServiceIds: [randomUUID()],
        photos: [{ role: 'FRONT', mimeType: 'image/jpeg', dataBase64: 'ZmFrZQ==' }],
      });

    expect(response.status).toBe(201);
  });

  it('rejects an unauthenticated custom-stitching request', async () => {
    const response = await request(app.getHttpServer()).post('/custom-stitching/requests').send({});
    expect(response.status).toBe(401);
  });

  it('accepts a minimal custom-stitching request (quote required)', async () => {
    downstream.request.mockResolvedValue({
      id: 'csr-1',
      garmentType: 'Kurta',
      referenceImages: [],
    });
    const response = await request(app.getHttpServer())
      .post('/custom-stitching/requests')
      .set('Cookie', await customerCookie())
      .send({ garmentType: 'Kurta' });

    expect(response.status).toBe(201);
  });
});
