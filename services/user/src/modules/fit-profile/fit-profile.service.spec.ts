import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { FitProfileService } from './fit-profile.service';

type FakeFitProfile = {
  id: string;
  customerProfileId: string;
  label: string;
  fitPreference: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
};

type FakeMeasurement = {
  id: string;
  fitProfileId: string;
  key: string;
  value: number;
  unit: string;
};

function buildPrismaMock(hasCustomerProfile = true) {
  const profileId = 'profile-1';
  const fitProfiles: FakeFitProfile[] = [];
  const measurements: FakeMeasurement[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    customerProfile: {
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) =>
        Promise.resolve(
          hasCustomerProfile && userId === 'user-1' ? { id: profileId, userId } : null,
        ),
      ),
    },
    fitProfile: {
      findFirst: jest.fn(
        ({ where }: { where: { customerProfileId: string; isActive: boolean } }) => {
          const fp = fitProfiles.find(
            (f) => f.customerProfileId === where.customerProfileId && f.isActive,
          );
          if (!fp) return Promise.resolve(null);
          return Promise.resolve({
            ...fp,
            measurements: measurements.filter((m) => m.fitProfileId === fp.id),
          });
        },
      ),
      create: jest.fn(
        ({ data }: { data: Omit<FakeFitProfile, 'id' | 'isActive' | 'createdAt'> }) => {
          const fp: FakeFitProfile = {
            ...data,
            id: randomUUID(),
            isActive: true,
            createdAt: new Date(),
          };
          fitProfiles.push(fp);
          return Promise.resolve(fp);
        },
      ),
      update: jest.fn(
        ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeFitProfile> }) => {
          const fp = fitProfiles.find((f) => f.id === id)!;
          Object.assign(fp, data);
          return Promise.resolve(fp);
        },
      ),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const fp = fitProfiles.find((f) => f.id === id)!;
        return Promise.resolve({
          ...fp,
          measurements: measurements.filter((m) => m.fitProfileId === id),
        });
      }),
    },
    fitMeasurement: {
      deleteMany: jest.fn(({ where: { fitProfileId } }: { where: { fitProfileId: string } }) => {
        for (let i = measurements.length - 1; i >= 0; i -= 1) {
          if (measurements[i]!.fitProfileId === fitProfileId) measurements.splice(i, 1);
        }
        return Promise.resolve({ count: 0 });
      }),
      createMany: jest.fn(({ data }: { data: Omit<FakeMeasurement, 'id' | 'unit'>[] }) => {
        for (const d of data) measurements.push({ ...d, id: randomUUID(), unit: 'in' });
        return Promise.resolve({ count: data.length });
      }),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };

  return { client } as unknown as PrismaService;
}

describe('FitProfileService', () => {
  it('creates a fit profile with measurements when none exists', async () => {
    const prisma = buildPrismaMock();
    const service = new FitProfileService(prisma);

    const result = await service.upsertByUserId('user-1', {
      label: 'My Fit',
      fitPreference: 'REGULAR',
      measurements: [{ key: 'CHEST', value: 40 }],
    });

    expect(result.label).toBe('My Fit');
    expect(result.measurements).toHaveLength(1);
    expect(result.measurements[0]).toMatchObject({ key: 'CHEST', value: 40 });
  });

  it('replaces measurements on update rather than accumulating them', async () => {
    const prisma = buildPrismaMock();
    const service = new FitProfileService(prisma);

    await service.upsertByUserId('user-1', {
      label: 'My Fit',
      fitPreference: 'REGULAR',
      measurements: [{ key: 'CHEST', value: 40 }],
    });
    const updated = await service.upsertByUserId('user-1', {
      label: 'My Fit',
      fitPreference: 'SLIM',
      measurements: [{ key: 'WAIST', value: 32 }],
    });

    expect(updated.fitPreference).toBe('SLIM');
    expect(updated.measurements).toHaveLength(1);
    expect(updated.measurements[0]).toMatchObject({ key: 'WAIST', value: 32 });
  });

  it('dedupes duplicate measurement keys, keeping the last value', async () => {
    const prisma = buildPrismaMock();
    const service = new FitProfileService(prisma);

    const result = await service.upsertByUserId('user-1', {
      label: 'My Fit',
      fitPreference: 'REGULAR',
      measurements: [
        { key: 'CHEST', value: 40 },
        { key: 'CHEST', value: 42 },
      ],
    });

    expect(result.measurements).toHaveLength(1);
    expect(result.measurements[0]).toMatchObject({ value: 42 });
  });

  it('returns null when the customer has no fit profile yet', async () => {
    const prisma = buildPrismaMock();
    const service = new FitProfileService(prisma);

    const result = await service.findByUserId('user-1');
    expect(result).toBeNull();
  });

  it('throws when the user has no customer profile at all', async () => {
    const prisma = buildPrismaMock(false);
    const service = new FitProfileService(prisma);

    await expect(service.findByUserId('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
