import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return { notifications: [] as Record<string, unknown>[] };
}

function seedNotification(db: ReturnType<typeof buildDb>, overrides: Partial<Record<string, unknown>> = {}) {
  const row = {
    id: randomUUID(),
    customerProfileId: CUSTOMER_PROFILE_ID,
    type: 'ORDER_PLACED',
    title: 'Order placed',
    message: 'We have received your order.',
    relatedOrderId: null,
    relatedOrderItemId: null,
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    ...overrides,
  };
  db.notifications.push(row);
  return row;
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
    notification: {
      findMany: jest.fn(
        ({
          where,
          take,
        }: {
          where: { customerProfileId: string; isRead?: boolean };
          take?: number;
        }) => {
          let rows = db.notifications.filter((n) => n.customerProfileId === where.customerProfileId);
          if (where.isRead !== undefined) rows = rows.filter((n) => n.isRead === where.isRead);
          rows = [...rows].sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
          return Promise.resolve(take ? rows.slice(0, take) : rows);
        },
      ),
      count: jest.fn(({ where }: { where: { customerProfileId: string; isRead?: boolean } }) => {
        let rows = db.notifications.filter((n) => n.customerProfileId === where.customerProfileId);
        if (where.isRead !== undefined) rows = rows.filter((n) => n.isRead === where.isRead);
        return Promise.resolve(rows.length);
      }),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.notifications.find((n) => n.id === id) ?? null),
      ),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.notifications.find((n) => n.id === id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }: { where: { customerProfileId: string; isRead: boolean }; data: Record<string, unknown> }) => {
        const rows = db.notifications.filter((n) => n.customerProfileId === where.customerProfileId && n.isRead === where.isRead);
        rows.forEach((r) => Object.assign(r, data));
        return Promise.resolve({ count: rows.length });
      }),
    },
  };
  return { client } as unknown as PrismaService;
}

describe('NotificationsService', () => {
  it('lists notifications with an accurate unread count', async () => {
    const db = buildDb();
    seedNotification(db);
    seedNotification(db, { isRead: true, readAt: new Date() });
    const service = new NotificationsService(buildPrismaMock(db));

    const result = await service.list('user-1');
    expect(result.items).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
    expect(result.total).toBe(2);
  });

  it('filters to unread only when requested', async () => {
    const db = buildDb();
    seedNotification(db);
    seedNotification(db, { isRead: true, readAt: new Date() });
    const service = new NotificationsService(buildPrismaMock(db));

    const result = await service.list('user-1', { unreadOnly: true });
    expect(result.items).toHaveLength(1);
  });

  it('marks a notification read', async () => {
    const db = buildDb();
    const n = seedNotification(db);
    const service = new NotificationsService(buildPrismaMock(db));

    const updated = await service.markRead('user-1', n.id as string);
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).not.toBeNull();
  });

  it('marks all notifications read', async () => {
    const db = buildDb();
    seedNotification(db);
    seedNotification(db);
    const service = new NotificationsService(buildPrismaMock(db));

    const result = await service.markAllRead('user-1');
    expect(result.updated).toBe(2);
    const list = await service.list('user-1');
    expect(list.unreadCount).toBe(0);
  });

  it("rejects reading another customer's notification", async () => {
    const db = buildDb();
    const n = seedNotification(db, { customerProfileId: OTHER_CUSTOMER_PROFILE_ID });
    const service = new NotificationsService(buildPrismaMock(db));

    await expect(service.markRead('user-1', n.id as string)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('carries relatedOrderId for order navigation', async () => {
    const db = buildDb();
    seedNotification(db, { relatedOrderId: 'order-1' });
    const service = new NotificationsService(buildPrismaMock(db));

    const result = await service.list('user-1');
    expect(result.items[0]!.relatedOrderId).toBe('order-1');
  });
});
