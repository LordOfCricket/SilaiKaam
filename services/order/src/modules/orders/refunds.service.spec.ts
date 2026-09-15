import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundsService } from './refunds.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    orders: [{ id: 'order-1', customerProfileId: CUSTOMER_PROFILE_ID }] as Record<string, unknown>[],
    refunds: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
  };
}

function seedRefund(db: ReturnType<typeof buildDb>, overrides: Partial<Record<string, unknown>> = {}) {
  const refund = {
    id: randomUUID(),
    orderId: 'order-1',
    orderItemId: null,
    customerProfileId: CUSTOMER_PROFILE_ID,
    amount: new Prisma.Decimal('1000.00'),
    currency: 'INR',
    reason: 'CANCELLATION',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: null,
    ...overrides,
  };
  db.refunds.push(refund);
  return refund;
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
    refund: {
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.refunds.filter((r) => r.orderId === orderId)),
      ),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.refunds.find((r) => r.id === id) ?? null),
      ),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.refunds.find((r) => r.id === id)!;
        Object.assign(row, data);
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

describe('RefundsService', () => {
  it('lists refunds with a correct Decimal-to-number amount', async () => {
    const db = buildDb();
    seedRefund(db);
    const service = new RefundsService(buildPrismaMock(db));

    const list = await service.list('user-1', 'order-1');
    expect(list).toHaveLength(1);
    expect(list[0]!.amount).toBe(1000);
    expect(list[0]!.status).toBe('PENDING');
  });

  it("rejects listing another customer's refunds", async () => {
    const db = buildDb();
    seedRefund(db);
    const service = new RefundsService(buildPrismaMock(db));

    await expect(service.list('user-2', 'order-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never claims success from a customer-facing path — status stays PENDING until processed', async () => {
    const db = buildDb();
    seedRefund(db);
    const service = new RefundsService(buildPrismaMock(db));

    const list = await service.list('user-1', 'order-1');
    expect(list[0]!.status).toBe('PENDING');
  });

  it('advances PENDING -> PROCESSING -> SUCCEEDED via internal ops only', async () => {
    const db = buildDb();
    const refund = seedRefund(db);
    const service = new RefundsService(buildPrismaMock(db));

    await service.process(refund.id, 'PROCESSING');
    expect(refund.status).toBe('PROCESSING');
    const result = await service.process(refund.id, 'SUCCEEDED');
    expect(result.status).toBe('SUCCEEDED');
    expect(refund.processedAt).not.toBeNull();
    expect(db.notifications.map((n) => n.type)).toEqual(expect.arrayContaining(['REFUND_PROCESSING', 'REFUND_COMPLETED']));
  });

  it('rejects an invalid refund transition', async () => {
    const db = buildDb();
    const refund = seedRefund(db);
    const service = new RefundsService(buildPrismaMock(db));

    await expect(service.process(refund.id, 'SUCCEEDED')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats a duplicate refund-status call as idempotent', async () => {
    const db = buildDb();
    const refund = seedRefund(db, { status: 'PROCESSING' });
    const service = new RefundsService(buildPrismaMock(db));

    await service.process(refund.id, 'PROCESSING');
    expect(db.notifications).toHaveLength(0);
  });
});
