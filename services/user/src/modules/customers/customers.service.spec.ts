import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from './customers.service';

type FakeProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  avatarUrl: string | null;
};

type FakeAddress = {
  id: string;
  customerProfileId: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
};

function buildPrismaMock(seedProfile?: Partial<FakeProfile>) {
  const profiles: FakeProfile[] = seedProfile
    ? [
        {
          id: seedProfile.id ?? 'profile-1',
          userId: seedProfile.userId ?? 'user-1',
          fullName: seedProfile.fullName ?? 'Jane Doe',
          phone: seedProfile.phone ?? null,
          dateOfBirth: seedProfile.dateOfBirth ?? null,
          gender: seedProfile.gender ?? null,
          avatarUrl: seedProfile.avatarUrl ?? null,
        },
      ]
    : [];
  const addresses: FakeAddress[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    customerProfile: {
      create: jest.fn(({ data }: { data: { userId: string; fullName: string } }) => {
        const profile: FakeProfile = {
          id: `profile-${profiles.length + 1}`,
          userId: data.userId,
          fullName: data.fullName,
          phone: null,
          dateOfBirth: null,
          gender: null,
          avatarUrl: null,
        };
        profiles.push(profile);
        return Promise.resolve({ ...profile, addresses: [] });
      }),
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) => {
        const profile = profiles.find((p) => p.userId === userId);
        if (!profile) return Promise.resolve(null);
        return Promise.resolve({
          ...profile,
          addresses: addresses.filter((a) => a.customerProfileId === profile.id && a.isActive),
        });
      }),
      update: jest.fn(
        ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeProfile> }) => {
          const profile = profiles.find((p) => p.id === id)!;
          Object.assign(profile, data);
          return Promise.resolve({
            ...profile,
            addresses: addresses.filter((a) => a.customerProfileId === profile.id && a.isActive),
          });
        },
      ),
    },
    address: {
      count: jest.fn(({ where }: { where: { customerProfileId: string; isActive: boolean } }) =>
        Promise.resolve(
          addresses.filter((a) => a.customerProfileId === where.customerProfileId && a.isActive)
            .length,
        ),
      ),
      updateMany: jest.fn(
        ({
          where,
        }: {
          where: { customerProfileId: string; isActive: boolean; id?: { not: string } };
        }) => {
          let count = 0;
          for (const address of addresses) {
            if (
              address.customerProfileId === where.customerProfileId &&
              address.isActive &&
              (!where.id || address.id !== where.id.not)
            ) {
              address.isDefault = false;
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
      ),
      create: jest.fn(({ data }: { data: Omit<FakeAddress, 'id' | 'isActive' | 'createdAt'> }) => {
        const address: FakeAddress = {
          ...data,
          id: randomUUID(),
          isActive: true,
          createdAt: new Date(),
        };
        addresses.push(address);
        return Promise.resolve(address);
      }),
      findFirst: jest.fn(
        ({ where }: { where: { id: string; customerProfileId: string; isActive: boolean } }) =>
          Promise.resolve(
            addresses.find(
              (a) =>
                a.id === where.id && a.customerProfileId === where.customerProfileId && a.isActive,
            ) ?? null,
          ),
      ),
      update: jest.fn(
        ({ where: { id }, data }: { where: { id: string }; data: Partial<FakeAddress> }) => {
          const address = addresses.find((a) => a.id === id)!;
          Object.assign(address, data);
          return Promise.resolve(address);
        },
      ),
      findMany: jest.fn(({ where }: { where: { customerProfileId: string; isActive: boolean } }) =>
        Promise.resolve(
          addresses.filter((a) => a.customerProfileId === where.customerProfileId && a.isActive),
        ),
      ),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };

  return { client } as unknown as PrismaService;
}

describe('CustomersService', () => {
  it('fetches the own profile for an existing user', async () => {
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    const profile = await service.findByUserId('user-1');

    expect(profile.fullName).toBe('Jane Doe');
  });

  it('throws NotFoundException when no profile exists for the user', async () => {
    const prisma = buildPrismaMock();
    const service = new CustomersService(prisma);

    await expect(service.findByUserId('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates the own profile fields', async () => {
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    const updated = await service.updateByUserId('user-1', { fullName: 'Jane A. Doe' });

    expect(updated.fullName).toBe('Jane A. Doe');
  });

  it('makes the first address the default automatically even when the form explicitly sends isDefault: false', async () => {
    // A real form always submits a defined boolean for a checkbox, never
    // `undefined` — this guards against `dto.isDefault ?? ...` silently
    // never kicking in because `false` short-circuits `??`.
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    const address = await service.createAddress('user-1', {
      line1: '221B Baker Street',
      city: 'Mumbai',
      state: 'MH',
      postalCode: '400001',
      isDefault: false,
    });

    expect(address.isDefault).toBe(true);
  });

  it('unsets the previous default when a new default address is added', async () => {
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    const first = await service.createAddress('user-1', {
      line1: 'Address 1',
      city: 'Mumbai',
      state: 'MH',
      postalCode: '400001',
    });
    const second = await service.createAddress('user-1', {
      line1: 'Address 2',
      city: 'Pune',
      state: 'MH',
      postalCode: '411001',
      isDefault: true,
    });

    const addresses = await service.listAddresses('user-1');
    const refreshedFirst = addresses.find((a) => a.id === first.id)!;
    expect(refreshedFirst.isDefault).toBe(false);
    expect(second.isDefault).toBe(true);
  });

  it('soft-deletes an address instead of removing it', async () => {
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    const address = await service.createAddress('user-1', {
      line1: 'Address 1',
      city: 'Mumbai',
      state: 'MH',
      postalCode: '400001',
    });

    await service.deleteAddress('user-1', address.id);

    const addresses = await service.listAddresses('user-1');
    expect(addresses).toHaveLength(0);
  });

  it('rejects operating on an address that belongs to a different customer', async () => {
    const prisma = buildPrismaMock({ userId: 'user-1' });
    const service = new CustomersService(prisma);

    await expect(
      service.updateAddress('user-1', 'not-a-real-address', { city: 'Delhi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
