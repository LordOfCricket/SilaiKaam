import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SupportService } from './support.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    orders: [{ id: 'order-1', customerProfileId: CUSTOMER_PROFILE_ID }] as Record<string, unknown>[],
    tickets: [] as Record<string, unknown>[],
    messages: [] as Record<string, unknown>[],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const withMessages = (ticket: Record<string, unknown>) => ({
    ...ticket,
    messages: db.messages.filter((m) => m.ticketId === ticket.id).sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()),
  });

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
    supportTicket: {
      findMany: jest.fn(({ where: { customerProfileId } }: { where: { customerProfileId: string } }) =>
        Promise.resolve(db.tickets.filter((t) => t.customerProfileId === customerProfileId)),
      ),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const ticket = db.tickets.find((t) => t.id === id);
        return Promise.resolve(ticket ? withMessages(ticket) : null);
      }),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const ticket = db.tickets.find((t) => t.id === id);
        if (!ticket) throw new Error('not found');
        return Promise.resolve(withMessages(ticket));
      }),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const ticket = {
          id: randomUUID(),
          status: 'OPEN',
          closedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        db.tickets.push(ticket);
        return Promise.resolve(withMessages(ticket));
      }),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const ticket = db.tickets.find((t) => t.id === id)!;
        Object.assign(ticket, data);
        return Promise.resolve(withMessages(ticket));
      }),
    },
    supportMessage: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const message = { id: randomUUID(), createdAt: new Date(), ...data };
        db.messages.push(message);
        return Promise.resolve(message);
      }),
    },
  };
  return { client } as unknown as PrismaService;
}

describe('SupportService', () => {
  it('creates a ticket', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', {
      category: 'ORDER',
      subject: 'Where is my order?',
      description: 'It has been a week and I have not received an update.',
    } as never);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.subject).toBe('Where is my order?');
  });

  it('preselects and validates an order the customer owns', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', {
      category: 'ORDER',
      orderId: 'order-1',
      subject: 'Delivery question',
      description: 'When will my order arrive at my address?',
    } as never);
    expect(ticket.orderId).toBe('order-1');
  });

  it('rejects attaching another customer\'s order', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    await expect(
      service.create('user-2', {
        category: 'ORDER',
        orderId: 'order-1',
        subject: 'Delivery question',
        description: 'When will my order arrive at my address?',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only the customer\'s own tickets', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    await service.create('user-1', { category: 'OTHER', subject: 'Hello there', description: 'General question about the app.' } as never);
    const list = await service.list('user-2');
    expect(list).toHaveLength(0);
  });

  it('adds a customer message to an open ticket', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', { category: 'OTHER', subject: 'Hello there', description: 'General question about the app.' } as never);
    const updated = await service.addMessage('user-1', ticket.id, { message: 'Any update?' } as never);
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]!.senderType).toBe('CUSTOMER');
  });

  it('rejects messages on a closed ticket', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', { category: 'OTHER', subject: 'Hello there', description: 'General question about the app.' } as never);
    await service.close('user-1', ticket.id);
    await expect(service.addMessage('user-1', ticket.id, { message: 'Still there?' } as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('closing an already-closed ticket is idempotent', async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', { category: 'OTHER', subject: 'Hello there', description: 'General question about the app.' } as never);
    await service.close('user-1', ticket.id);
    const secondClose = await service.close('user-1', ticket.id);
    expect(secondClose.status).toBe('CLOSED');
  });

  it("rejects viewing another customer's ticket", async () => {
    const db = buildDb();
    const service = new SupportService(buildPrismaMock(db));
    const ticket = await service.create('user-1', { category: 'OTHER', subject: 'Hello there', description: 'General question about the app.' } as never);
    await expect(service.get('user-2', ticket.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
