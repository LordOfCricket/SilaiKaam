import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ExistingGarmentService } from './existing-garment.service';
import type { CreateExistingGarmentRequestDto } from './dto/create-existing-garment-request.dto';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_FIT_PROFILE_ID = randomUUID();
const OWNED_FIT_PROFILE_ID = randomUUID();
const SERVICE_ID = randomUUID();
const SERVICE_NEEDING_MEASUREMENT_ID = randomUUID();
const SERVICE_NEEDING_OTHER_MEASUREMENT_ID = randomUUID();

function buildPrismaMock() {
  const requests: unknown[] = [];
  const photos: unknown[] = [];
  const measurementsByProfile: Record<string, string[]> = { [OWNED_FIT_PROFILE_ID]: ['CHEST'] };

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
    fittingService: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(
          where.id.in
            .filter(
              (id) =>
                id === SERVICE_ID ||
                id === SERVICE_NEEDING_MEASUREMENT_ID ||
                id === SERVICE_NEEDING_OTHER_MEASUREMENT_ID,
            )
            .map((id) => ({
              id,
              requiredMeasurements:
                id === SERVICE_NEEDING_MEASUREMENT_ID
                  ? ['CHEST']
                  : id === SERVICE_NEEDING_OTHER_MEASUREMENT_ID
                    ? ['SLEEVE']
                    : [],
            })),
        ),
      ),
    },
    fitMeasurement: {
      findMany: jest.fn(({ where: { fitProfileId } }: { where: { fitProfileId: string } }) =>
        Promise.resolve((measurementsByProfile[fitProfileId] ?? []).map((key) => ({ key }))),
      ),
    },
    existingGarmentRequest: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const request = { id: randomUUID(), ...data };
        requests.push(request);
        return Promise.resolve(request);
      }),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const request = requests.find((r) => (r as { id: string }).id === id);
        return Promise.resolve({
          ...(request as object),
          photos: photos.filter((p) => (p as { requestId: string }).requestId === id),
        });
      }),
    },
    garmentPhoto: {
      createMany: jest.fn(({ data }: { data: Record<string, unknown>[] }) => {
        for (const d of data) photos.push({ id: randomUUID(), ...d });
        return Promise.resolve({ count: data.length });
      }),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };

  return { client } as unknown as PrismaService;
}

function baseDto(
  overrides: Partial<CreateExistingGarmentRequestDto> = {},
): CreateExistingGarmentRequestDto {
  return {
    garmentType: 'Shirt',
    condition: 'GOOD',
    selectedFittingServiceIds: [SERVICE_ID],
    photos: [
      {
        role: 'FRONT',
        mimeType: 'image/jpeg',
        dataBase64: Buffer.from('fake-image').toString('base64'),
      },
    ],
    ...overrides,
  } as CreateExistingGarmentRequestDto;
}

describe('ExistingGarmentService', () => {
  it('creates a request with photos and fitting services', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    const result = await service.create('user-1', baseDto());

    expect(result).toMatchObject({ garmentType: 'Shirt', condition: 'GOOD' });
    expect((result as { photos: unknown[] }).photos).toHaveLength(1);
  });

  it('rejects a fit profile that does not belong to the customer', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    await expect(
      service.create('user-1', baseDto({ fitProfileId: OTHER_FIT_PROFILE_ID })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts an owned fit profile', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    const result = await service.create('user-1', baseDto({ fitProfileId: OWNED_FIT_PROFILE_ID }));
    expect(result).toMatchObject({ fitProfileId: OWNED_FIT_PROFILE_ID });
  });

  it('rejects an unavailable fitting service', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    await expect(
      service.create('user-1', baseDto({ selectedFittingServiceIds: [randomUUID()] })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a service requiring a measurement when no fit profile is provided', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    await expect(
      service.create(
        'user-1',
        baseDto({ selectedFittingServiceIds: [SERVICE_NEEDING_MEASUREMENT_ID] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a service when the fit profile has the required measurement', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    await expect(
      service.create(
        'user-1',
        baseDto({
          fitProfileId: OWNED_FIT_PROFILE_ID,
          selectedFittingServiceIds: [SERVICE_NEEDING_MEASUREMENT_ID],
        }),
      ),
    ).resolves.toBeDefined();
  });

  it('rejects a service requiring a measurement missing from the fit profile', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);

    await expect(
      service.create(
        'user-1',
        baseDto({
          fitProfileId: OWNED_FIT_PROFILE_ID,
          selectedFittingServiceIds: [SERVICE_NEEDING_OTHER_MEASUREMENT_ID],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a photo larger than the configured limit', async () => {
    const prisma = buildPrismaMock();
    const service = new ExistingGarmentService(prisma);
    const hugeBase64 = Buffer.alloc(4 * 1024 * 1024).toString('base64');

    await expect(
      service.create(
        'user-1',
        baseDto({ photos: [{ role: 'FRONT', mimeType: 'image/jpeg', dataBase64: hugeBase64 }] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
