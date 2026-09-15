import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DisputesService } from './disputes.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    orders: [
      { id: 'order-1', customerProfileId: CUSTOMER_PROFILE_ID, status: 'DELIVERED' },
      { id: 'order-cancelled', customerProfileId: CUSTOMER_PROFILE_ID, status: 'CANCELLED' },
    ] as Record<string, unknown>[],
    orderItems: [{ id: 'item-1', orderId: 'order-1' }] as Record<string, unknown>[],
    disputes: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const client: any = {
    customerProfile: {
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) =>
        Promise.resolve(
          userId === 'user-1' ? { id: CUSTOMER_PROFILE_ID } : userId === 'user-2' ? { id: OTHER_CUSTOMER_PROFILE_ID } : null,
        ),
      ),
    },
    order: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.orders.find((o) => o.id === id) ?? null),
      ),
    },
    orderItem: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.orderItems.find((i) => i.id === id) ?? null),
      ),
    },
    dispute: {
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.disputes.filter((d) => d.orderId === orderId)),
      ),
      findFirst: jest.fn(
        ({ where }: { where: { orderId: string; type: string; status: { in: string[] } } }) =>
          Promise.resolve(
            db.disputes.find(
              (d) => d.orderId === where.orderId && d.type === where.type && where.status.in.includes(d.status as string),
            ) ?? null,
          ),
      ),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.disputes.find((d) => d.id === id) ?? null),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: randomUUID(),
          status: 'OPEN',
          resolution: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
          ...data,
        };
        db.disputes.push(row);
        return Promise.resolve(row);
      }),
    },
    notification: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.notifications.push(row);
        return Promise.resolve(row);
      }),
    },
  };
  return { client } as unknown as PrismaService;
}

describe('DisputesService', () => {
  it('creates a valid dispute for a delivered order', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    const dispute = await service.create('user-1', 'order-1', {
      type: 'QUALITY_ISSUE',
      description: 'The stitching came apart after one wash.',
    } as never);

    expect(dispute.status).toBe('OPEN');
    expect(db.notifications.map((n) => n.type)).toContain('DISPUTE_OPENED');
  });

  it('fires a REWORK_REQUESTED notification for fit issues specifically', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    await service.create('user-1', 'order-1', { type: 'FIT_ISSUE', description: 'The sleeves are too tight for me.' } as never);
    expect(db.notifications.map((n) => n.type)).toEqual(expect.arrayContaining(['DISPUTE_OPENED', 'REWORK_REQUESTED']));
  });

  it('rejects a duplicate unresolved dispute for the same order+type', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    await service.create('user-1', 'order-1', { type: 'QUALITY_ISSUE', description: 'The stitching came apart.' } as never);
    await expect(
      service.create('user-1', 'order-1', { type: 'QUALITY_ISSUE', description: 'Still an issue with quality.' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates the order item belongs to the order', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    await expect(
      service.create('user-1', 'order-1', {
        type: 'MISSING_ITEM',
        orderItemId: 'not-a-real-item',
        description: 'One of the items was missing from my delivery.',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a dispute on a cancelled order', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    await expect(
      service.create('user-1', 'order-cancelled', { type: 'OTHER', description: 'General complaint about this order.' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects creating a dispute on another customer's order", async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));

    await expect(
      service.create('user-2', 'order-1', { type: 'OTHER', description: 'Trying to dispute someone else order.' } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects viewing another customer's dispute", async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));
    const dispute = await service.create('user-1', 'order-1', { type: 'OTHER', description: 'General issue with this order.' } as never);

    await expect(service.get('user-2', 'order-1', dispute.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only disputes for the given order', async () => {
    const db = buildDb();
    const service = new DisputesService(buildPrismaMock(db));
    await service.create('user-1', 'order-1', { type: 'OTHER', description: 'General issue with this order.' } as never);

    const list = await service.list('user-1', 'order-1');
    expect(list).toHaveLength(1);
  });
});
