import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CancellationService } from './cancellation.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    variants: [{ id: 'variant-1', stock: 3 }] as Record<string, unknown>[],
    orders: [] as Record<string, unknown>[],
    orderStatusHistory: [] as Record<string, unknown>[],
    orderCancellations: [] as Record<string, unknown>[],
    refunds: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
  };
}

function seedOrder(db: ReturnType<typeof buildDb>, overrides: Partial<Record<string, unknown>> = {}) {
  const order = {
    id: randomUUID(),
    customerProfileId: CUSTOMER_PROFILE_ID,
    status: 'PLACED',
    total: 1000,
    items: [{ id: randomUUID(), variantId: 'variant-1', quantity: 2 }],
    ...overrides,
  };
  db.orders.push(order);
  return order;
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
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = db.orders.find((x) => x.id === id)!;
        Object.assign(o, data);
        return Promise.resolve(o);
      }),
    },
    productVariant: {
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: { stock: { increment: number } } }) => {
        const v = db.variants.find((x) => x.id === id)!;
        v.stock = (v.stock as number) + data.stock.increment;
        return Promise.resolve(v);
      }),
    },
    orderStatusHistory: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.orderStatusHistory.push(row);
        return Promise.resolve(row);
      }),
    },
    orderCancellation: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        if (db.orderCancellations.some((c) => c.orderId === data.orderId)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        }
        const row = { id: randomUUID(), createdAt: new Date(), note: null, ...data };
        db.orderCancellations.push(row);
        return Promise.resolve(row);
      }),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const row = db.orderCancellations.find((c) => c.id === id);
        if (!row) throw new Error('not found');
        return Promise.resolve(row);
      }),
    },
    refund: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), processedAt: null, ...data };
        db.refunds.push(row);
        return Promise.resolve(row);
      }),
    },
    notification: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        if (db.notifications.some((n) => n.dedupeKey === data.dedupeKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        }
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.notifications.push(row);
        return Promise.resolve(row);
      }),
    },
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: unknown) => Promise<unknown>)(client);
    }),
  };
  return { client } as unknown as PrismaService;
}

describe('CancellationService', () => {
  it('cancels an eligible order, restores stock exactly once, and creates a pending refund', async () => {
    const db = buildDb();
    const order = seedOrder(db);
    const service = new CancellationService(buildPrismaMock(db));

    const result = await service.cancel('user-1', order.id, { reason: 'CUSTOMER_CHANGED_MIND' } as never);

    expect(order.status).toBe('CANCELLED');
    expect(db.variants[0]!.stock).toBe(5); // 3 + 2 restored
    expect(result.refundCreated).toBe(true);
    expect(db.refunds).toHaveLength(1);
    expect(db.refunds[0]!.status).toBe('PENDING');
    expect(db.notifications.map((n) => n.type)).toEqual(
      expect.arrayContaining(['CANCELLATION_CONFIRMED', 'REFUND_REQUESTED']),
    );
  });

  it('rejects cancelling an already-cancelled order', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'CANCELLED' });
    const service = new CancellationService(buildPrismaMock(db));

    await expect(service.cancel('user-1', order.id, { reason: 'OTHER' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.variants[0]!.stock).toBe(3); // untouched
  });

  it('rejects cancelling a completed/delivered order', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'DELIVERED' });
    const service = new CancellationService(buildPrismaMock(db));

    await expect(service.cancel('user-1', order.id, { reason: 'OTHER' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects cancelling an order in active fitting', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'FITTING' });
    const service = new CancellationService(buildPrismaMock(db));

    await expect(service.cancel('user-1', order.id, { reason: 'OTHER' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not restore stock twice on a duplicate cancellation attempt', async () => {
    const db = buildDb();
    const order = seedOrder(db);
    const service = new CancellationService(buildPrismaMock(db));

    await service.cancel('user-1', order.id, { reason: 'OTHER' } as never);
    await expect(service.cancel('user-1', order.id, { reason: 'OTHER' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.variants[0]!.stock).toBe(5); // restored only once
    expect(db.refunds).toHaveLength(1);
  });

  it("rejects cancelling another customer's order", async () => {
    const db = buildDb();
    const order = seedOrder(db);
    const service = new CancellationService(buildPrismaMock(db));

    await expect(service.cancel('user-2', order.id, { reason: 'OTHER' } as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports eligibility correctly for cancellable vs. non-cancellable statuses', () => {
    const db = buildDb();
    const service = new CancellationService(buildPrismaMock(db));

    expect(service.getEligibility('PLACED').eligible).toBe(true);
    expect(service.getEligibility('CONFIRMED').eligible).toBe(true);
    expect(service.getEligibility('PREPARING').eligible).toBe(true);
    expect(service.getEligibility('FITTING').eligible).toBe(false);
    expect(service.getEligibility('DELIVERED').eligible).toBe(false);
    expect(service.getEligibility('CANCELLED').eligible).toBe(false);
  });
});
