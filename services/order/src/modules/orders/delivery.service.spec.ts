import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryService } from './delivery.service';

function buildDb() {
  return {
    orders: [] as Record<string, unknown>[],
    orderStatusHistory: [] as Record<string, unknown>[],
    fittingWorkflows: [] as Record<string, unknown>[],
  };
}

function seedOrder(db: ReturnType<typeof buildDb>, overrides: Partial<Record<string, unknown>> = {}) {
  const order = { id: randomUUID(), status: 'PLACED', ...overrides };
  db.orders.push(order);
  return order;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const client: any = {
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
    orderStatusHistory: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.orderStatusHistory.push(row);
        return Promise.resolve(row);
      }),
    },
    fittingWorkflow: {
      count: jest.fn(({ where }: { where: { orderId: string; status: { notIn: string[] } } }) =>
        Promise.resolve(
          db.fittingWorkflows.filter(
            (w) => w.orderId === where.orderId && !where.status.notIn.includes(w.status as string),
          ).length,
        ),
      ),
    },
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: unknown) => Promise<unknown>)(client);
    }),
  };
  return { client } as unknown as PrismaService;
}

describe('DeliveryService', () => {
  it('begins delivery prep for an order with no fitting items', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'PLACED' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.beginPreparingForDelivery(order.id, 'STAFF');
    expect(order.status).toBe('PREPARING_FOR_DELIVERY');
  });

  it('blocks delivery prep while a fitting item is not yet ready', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'READY' });
    db.fittingWorkflows.push({ orderId: order.id, status: 'IN_PROGRESS' });
    const service = new DeliveryService(buildPrismaMock(db));

    await expect(service.beginPreparingForDelivery(order.id, 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
    expect(order.status).toBe('READY');
  });

  it('allows delivery prep once all fitting items are ready', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'READY' });
    db.fittingWorkflows.push({ orderId: order.id, status: 'READY' }, { orderId: order.id, status: 'COMPLETED' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.beginPreparingForDelivery(order.id, 'STAFF');
    expect(order.status).toBe('PREPARING_FOR_DELIVERY');
  });

  it('rejects delivery prep from an invalid source status', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'OUT_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await expect(service.beginPreparingForDelivery(order.id, 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats a duplicate beginPreparingForDelivery call as idempotent', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'PREPARING_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.beginPreparingForDelivery(order.id, 'STAFF');
    expect(db.orderStatusHistory).toHaveLength(0);
  });

  it('advances PREPARING_FOR_DELIVERY -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'PREPARING_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.advance(order.id, 'OUT_FOR_DELIVERY', 'STAFF');
    expect(order.status).toBe('OUT_FOR_DELIVERY');
    await service.advance(order.id, 'DELIVERED', 'STAFF');
    expect(order.status).toBe('DELIVERED');
    await service.advance(order.id, 'COMPLETED', 'STAFF');
    expect(order.status).toBe('COMPLETED');
  });

  it('supports a failed delivery followed by a reschedule and retry', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'OUT_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.advance(order.id, 'DELIVERY_FAILED', 'STAFF');
    expect(order.status).toBe('DELIVERY_FAILED');
    await service.advance(order.id, 'DELIVERY_RESCHEDULED', 'STAFF');
    expect(order.status).toBe('DELIVERY_RESCHEDULED');
    await service.advance(order.id, 'OUT_FOR_DELIVERY', 'STAFF');
    expect(order.status).toBe('OUT_FOR_DELIVERY');
  });

  it('rejects an invalid delivery transition', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'PREPARING_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await expect(service.advance(order.id, 'DELIVERED', 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects marking delivered before out-for-delivery', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'READY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await expect(service.advance(order.id, 'DELIVERED', 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects completing an order before it has been delivered', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'OUT_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await expect(service.advance(order.id, 'COMPLETED', 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats a duplicate delivery transition as idempotent', async () => {
    const db = buildDb();
    const order = seedOrder(db, { status: 'OUT_FOR_DELIVERY' });
    const service = new DeliveryService(buildPrismaMock(db));

    await service.advance(order.id, 'OUT_FOR_DELIVERY', 'STAFF');
    expect(db.orderStatusHistory).toHaveLength(0);
  });

  it('throws for an unknown order id', async () => {
    const db = buildDb();
    const service = new DeliveryService(buildPrismaMock(db));
    await expect(service.advance('missing', 'OUT_FOR_DELIVERY', 'STAFF')).rejects.toBeInstanceOf(NotFoundException);
  });
});
