import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomStitchingService } from './custom-stitching.service';
import type { CreateCustomStitchingRequestDto } from './dto/create-custom-stitching-request.dto';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OWNED_FIT_PROFILE_ID = randomUUID();
const OTHER_FIT_PROFILE_ID = randomUUID();

function buildPrismaMock() {
  const requests: unknown[] = [];
  const images: unknown[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    customerProfile: {
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) =>
        Promise.resolve(userId === 'user-1' ? { id: CUSTOMER_PROFILE_ID, userId } : null),
      ),
    },
    fitProfile: {
      findFirst: jest.fn(({ where }: { where: { id: string; customerProfileId: string } }) =>
        Promise.resolve(
          where.id === OWNED_FIT_PROFILE_ID && where.customerProfileId === CUSTOMER_PROFILE_ID
            ? { id: OWNED_FIT_PROFILE_ID }
            : null,
        ),
      ),
    },
    customStitchingRequest: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const request = { id: randomUUID(), ...data };
        requests.push(request);
        return Promise.resolve(request);
      }),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const request = requests.find((r) => (r as { id: string }).id === id);
        return Promise.resolve({
          ...(request as object),
          referenceImages: images.filter((i) => (i as { requestId: string }).requestId === id),
        });
      }),
    },
    customStitchingReferenceImage: {
      createMany: jest.fn(({ data }: { data: Record<string, unknown>[] }) => {
        for (const d of data) images.push({ id: randomUUID(), ...d });
        return Promise.resolve({ count: data.length });
      }),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };

  return { client } as unknown as PrismaService;
}

function baseDto(
  overrides: Partial<CreateCustomStitchingRequestDto> = {},
): CreateCustomStitchingRequestDto {
  return { garmentType: 'Kurta', ...overrides } as CreateCustomStitchingRequestDto;
}

describe('CustomStitchingService', () => {
  it('creates a request without reference images', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomStitchingService(prisma);

    const result = await service.create('user-1', baseDto());
    expect(result).toMatchObject({ garmentType: 'Kurta' });
    expect((result as { referenceImages: unknown[] }).referenceImages).toEqual([]);
  });

  it('creates a request with reference images', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomStitchingService(prisma);

    const result = await service.create(
      'user-1',
      baseDto({
        referenceImages: [
          { mimeType: 'image/png', dataBase64: Buffer.from('ref').toString('base64') },
        ],
      }),
    );
    expect((result as { referenceImages: unknown[] }).referenceImages).toHaveLength(1);
  });

  it('rejects a fit profile that does not belong to the customer', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomStitchingService(prisma);

    await expect(
      service.create('user-1', baseDto({ fitProfileId: OTHER_FIT_PROFILE_ID })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts an owned fit profile', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomStitchingService(prisma);

    const result = await service.create('user-1', baseDto({ fitProfileId: OWNED_FIT_PROFILE_ID }));
    expect(result).toMatchObject({ fitProfileId: OWNED_FIT_PROFILE_ID });
  });

  it('rejects a reference image larger than the configured limit', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomStitchingService(prisma);
    const hugeBase64 = Buffer.alloc(4 * 1024 * 1024).toString('base64');

    await expect(
      service.create(
        'user-1',
        baseDto({ referenceImages: [{ mimeType: 'image/png', dataBase64: hugeBase64 }] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
