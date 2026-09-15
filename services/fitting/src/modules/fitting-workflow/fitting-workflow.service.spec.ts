import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { FittingWorkflowService } from './fitting-workflow.service';

function buildDb() {
  return {
    workflows: [] as Record<string, unknown>[],
    statusHistory: [] as Record<string, unknown>[],
    inspections: [] as Record<string, unknown>[],
    actionRequests: [] as Record<string, unknown>[],
    photos: [] as Record<string, unknown>[],
    orders: [{ id: 'order-1', status: 'PLACED' }] as Record<string, unknown>[],
    orderStatusHistory: [] as Record<string, unknown>[],
  };
}

function seedWorkflow(db: ReturnType<typeof buildDb>, overrides: Partial<Record<string, unknown>> = {}) {
  const workflow = {
    id: randomUUID(),
    orderId: 'order-1',
    orderItemId: randomUUID(),
    customerProfileId: 'profile-1',
    itemType: 'PRODUCT_WITH_FITTING',
    status: 'RECEIVED',
    ...overrides,
  };
  db.workflows.push(workflow);
  return workflow;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const client: any = {
    fittingWorkflow: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.workflows.find((w) => w.id === id) ?? null),
      ),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const w = db.workflows.find((x) => x.id === id)!;
        Object.assign(w, data);
        return Promise.resolve(w);
      }),
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.workflows.filter((w) => w.orderId === orderId)),
      ),
    },
    fittingStatusHistory: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.statusHistory.push(row);
        return Promise.resolve(row);
      }),
    },
    fittingInspection: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.inspections.push(row);
        return Promise.resolve(row);
      }),
      findFirst: jest.fn(({ where }: { where: { fittingWorkflowId: string; stage: string } }) => {
        // Insertion order is our "most recent" proxy — avoids flaky ties
        // when multiple rows share the same millisecond `new Date()`.
        const matches = db.inspections.filter(
          (i) => i.fittingWorkflowId === where.fittingWorkflowId && i.stage === where.stage,
        );
        return Promise.resolve(matches[matches.length - 1] ?? null);
      }),
    },
    fittingActionRequest: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), status: 'PENDING', createdAt: new Date(), ...data };
        db.actionRequests.push(row);
        return Promise.resolve(row);
      }),
    },
    garmentPhoto: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.photos.push(row);
        return Promise.resolve(row);
      }),
      count: jest.fn(({ where }: { where: { fittingWorkflowId: string; role: string } }) =>
        Promise.resolve(
          db.photos.filter((p) => p.fittingWorkflowId === where.fittingWorkflowId && p.role === where.role).length,
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
    orderStatusHistory: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.orderStatusHistory.push(row);
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

describe('FittingWorkflowService', () => {
  it('recordInspection PASS moves RECEIVED -> ASSIGNED and syncs order to FITTING', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db);
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.recordInspection(workflow.id, {
      outcome: 'PASS',
      garmentCondition: 'GOOD',
      actorSource: 'STAFF',
    } as never);

    expect(workflow.status).toBe('ASSIGNED');
    expect(db.orders[0]!.status).toBe('FITTING');
  });

  it('recordInspection ACTION_REQUIRED creates an action request and keeps order at PREPARING', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db);
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.recordInspection(workflow.id, {
      outcome: 'ACTION_REQUIRED',
      garmentCondition: 'WORN',
      actorSource: 'STAFF',
      requestedInfo: 'Please confirm the sleeve length.',
    } as never);

    expect(workflow.status).toBe('ACTION_REQUIRED');
    expect(db.actionRequests).toHaveLength(1);
    expect(db.orders[0]!.status).toBe('PREPARING');
  });

  it('rejects ACTION_REQUIRED outcome without requestedInfo', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db);
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await expect(
      service.recordInspection(workflow.id, {
        outcome: 'ACTION_REQUIRED',
        garmentCondition: 'WORN',
        actorSource: 'STAFF',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects recording an inspection from a non-inspectable status', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'IN_PROGRESS' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await expect(
      service.recordInspection(workflow.id, { outcome: 'PASS', garmentCondition: 'GOOD', actorSource: 'STAFF' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid generic transition', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'RECEIVED' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await expect(
      service.advance(workflow.id, { status: 'QC', actorSource: 'STAFF' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks READY without ready-garment proof', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await expect(service.markReady(workflow.id, 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
    expect(workflow.status).toBe('QC');
  });

  it('allows READY once QC has passed and a ready-garment photo exists', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.uploadReadyPhoto(workflow.id, { mimeType: 'image/png', dataBase64: 'aGVsbG8=' } as never);
    await service.recordQualityCheck(workflow.id, { outcome: 'PASS', actorSource: 'STAFF' } as never);
    await service.markReady(workflow.id, 'STAFF');

    expect(workflow.status).toBe('READY');
    expect(db.orders[0]!.status).toBe('READY');
  });

  it('rejects READY when QC has not passed', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.uploadReadyPhoto(workflow.id, { mimeType: 'image/png', dataBase64: 'aGVsbG8=' } as never);
    await expect(service.markReady(workflow.id, 'STAFF')).rejects.toBeInstanceOf(BadRequestException);
    expect(workflow.status).toBe('QC');
  });

  it('QC PASS keeps the workflow at QC (it only unlocks markReady)', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.recordQualityCheck(workflow.id, { outcome: 'PASS', actorSource: 'STAFF' } as never);
    expect(workflow.status).toBe('QC');
    expect(db.inspections).toHaveLength(1);
    expect(db.inspections[0]!.stage).toBe('QC');
  });

  it('QC REWORK_REQUIRED sends the workflow back to REWORK_REQUIRED', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.recordQualityCheck(workflow.id, { outcome: 'REWORK_REQUIRED', actorSource: 'STAFF' } as never);
    expect(workflow.status).toBe('REWORK_REQUIRED');
    expect(db.orders[0]!.status).toBe('FITTING');
  });

  it('rejects recording a quality check from a status other than QC', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'IN_PROGRESS' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await expect(
      service.recordQualityCheck(workflow.id, { outcome: 'PASS', actorSource: 'STAFF' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports the rework loop: QC -> REWORK_REQUIRED -> IN_PROGRESS -> QC -> PASS -> READY', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.recordQualityCheck(workflow.id, { outcome: 'REWORK_REQUIRED', actorSource: 'STAFF' } as never);
    expect(workflow.status).toBe('REWORK_REQUIRED');
    expect(db.orders[0]!.status).toBe('FITTING');

    await service.advance(workflow.id, { status: 'IN_PROGRESS', actorSource: 'STAFF' } as never);
    await service.advance(workflow.id, { status: 'QC', actorSource: 'STAFF' } as never);
    await service.recordQualityCheck(workflow.id, { outcome: 'PASS', actorSource: 'STAFF' } as never);
    await service.uploadReadyPhoto(workflow.id, { mimeType: 'image/png', dataBase64: 'aGVsbG8=' } as never);
    await service.markReady(workflow.id, 'STAFF');

    expect(workflow.status).toBe('READY');
  });

  it('treats a duplicate READY call as a safe no-op', async () => {
    const db = buildDb();
    const workflow = seedWorkflow(db, { status: 'QC' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    await service.uploadReadyPhoto(workflow.id, { mimeType: 'image/png', dataBase64: 'aGVsbG8=' } as never);
    await service.recordQualityCheck(workflow.id, { outcome: 'PASS', actorSource: 'STAFF' } as never);
    await service.markReady(workflow.id, 'STAFF');
    const historyLengthAfterFirst = db.statusHistory.length;

    await service.markReady(workflow.id, 'STAFF');

    expect(workflow.status).toBe('READY');
    expect(db.statusHistory.length).toBe(historyLengthAfterFirst);
  });

  it('throws for an unknown workflow id', async () => {
    const db = buildDb();
    const service = new FittingWorkflowService(buildPrismaMock(db));
    await expect(service.markReady('missing', 'STAFF')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aggregates a multi-item order to the least-advanced fitting workflow, deterministically', async () => {
    const db = buildDb();
    const itemA = seedWorkflow(db, { status: 'RECEIVED' });
    const itemB = seedWorkflow(db, { status: 'RECEIVED' });
    const service = new FittingWorkflowService(buildPrismaMock(db));

    // Item B races ahead to ASSIGNED (ranked FITTING) while A is still RECEIVED (PREPARING).
    await service.recordInspection(itemB.id, { outcome: 'PASS', garmentCondition: 'GOOD', actorSource: 'STAFF' } as never);
    expect(db.orders[0]!.status).toBe('PREPARING');

    // Once A also reaches ASSIGNED, the order can advance to FITTING.
    await service.recordInspection(itemA.id, { outcome: 'PASS', garmentCondition: 'GOOD', actorSource: 'STAFF' } as never);
    expect(db.orders[0]!.status).toBe('FITTING');
  });
});
