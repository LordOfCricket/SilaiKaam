import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { randomUUID } from 'node:crypto';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CancellationService } from './cancellation.service';
import { OrdersService } from './orders.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    products: [
      {
        id: 'product-1',
        name: 'Shirt',
        isActive: true,
        isFittingEligible: true,
        categoryId: 'cat-1',
        price: 1000,
        discountPrice: null,
        variants: [
          { id: 'variant-1', productId: 'product-1', isActive: true, stock: 2, size: 'M', color: 'Blue', price: null },
        ],
      },
    ] as Record<string, unknown>[],
    fitProfiles: [
      { id: 'fp-1', customerProfileId: CUSTOMER_PROFILE_ID, isActive: true, label: 'My Fit', fitPreference: 'REGULAR' },
    ] as Record<string, unknown>[],
    fitMeasurements: [{ fitProfileId: 'fp-1', key: 'CHEST', value: 40, unit: 'in' }] as Record<string, unknown>[],
    fittingServices: [
      {
        id: 'fs-1',
        isActive: true,
        name: 'Chest alteration',
        basePrice: 200,
        requiredMeasurements: ['CHEST'],
        categories: [{ categoryId: 'cat-1' }],
      },
    ] as Record<string, unknown>[],
    addresses: [
      {
        id: 'addr-1',
        customerProfileId: CUSTOMER_PROFILE_ID,
        isActive: true,
        label: 'Home',
        line1: '1 Main St',
        line2: null,
        city: 'Pune',
        state: 'MH',
        postalCode: '411001',
        country: 'IN',
      },
    ] as Record<string, unknown>[],
    carts: [] as Record<string, unknown>[],
    cartItems: [] as Record<string, unknown>[],
    existingGarmentRequests: [
      { id: 'egr-1', customerProfileId: CUSTOMER_PROFILE_ID, garmentType: 'Shirt', condition: 'GOOD', brand: null, notes: null, fitProfileId: null, selectedFittingServiceIds: [], photos: [{ id: 'p1' }] },
    ] as Record<string, unknown>[],
    customStitchingRequests: [
      { id: 'csr-1', customerProfileId: CUSTOMER_PROFILE_ID, garmentType: 'Kurta', fabricDetails: 'Cotton', designDetails: 'Simple', fitProfileId: null, notes: null },
    ] as Record<string, unknown>[],
    orders: [] as Record<string, unknown>[],
    fittingWorkflows: [] as Record<string, unknown>[],
    fittingStatusHistory: [] as Record<string, unknown>[],
    fittingActionRequests: [] as Record<string, unknown>[],
    reviews: [] as Record<string, unknown>[],
    orderCancellations: [] as Record<string, unknown>[],
    refunds: [] as Record<string, unknown>[],
    disputes: [] as Record<string, unknown>[],
  };
}

function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const client: Record<string, unknown> = {
    customerProfile: {
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) =>
        Promise.resolve(
          userId === 'user-1' ? { id: CUSTOMER_PROFILE_ID } : userId === 'user-2' ? { id: OTHER_CUSTOMER_PROFILE_ID } : null,
        ),
      ),
    },
    cart: {
      findUnique: jest.fn(({ where: { customerProfileId } }: { where: { customerProfileId: string } }) =>
        Promise.resolve(db.carts.find((c) => c.customerProfileId === customerProfileId) ?? null),
      ),
      create: jest.fn(({ data }: { data: { customerProfileId: string } }) => {
        const cart = { id: randomUUID(), ...data };
        db.carts.push(cart);
        return Promise.resolve(cart);
      }),
    },
    product: {
      findFirst: jest.fn(({ where }: { where: { id: string; isActive: boolean } }) =>
        Promise.resolve(db.products.find((p) => p.id === where.id && p.isActive === where.isActive) ?? null),
      ),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.products.find((p) => p.id === id) ?? null),
      ),
    },
    productVariant: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        for (const p of db.products) {
          const v = (p.variants as Record<string, unknown>[]).find((x) => x.id === id);
          if (v) return Promise.resolve(v);
        }
        return Promise.resolve(null);
      }),
      updateMany: jest.fn(
        ({ where, data }: { where: { id: string; isActive: boolean; stock: { gte: number } }; data: { stock: { decrement: number } } }) => {
          for (const p of db.products) {
            const v = (p.variants as Record<string, unknown>[]).find((x) => x.id === where.id);
            if (v && v.isActive === where.isActive && (v.stock as number) >= where.stock.gte) {
              v.stock = (v.stock as number) - data.stock.decrement;
              return Promise.resolve({ count: 1 });
            }
          }
          return Promise.resolve({ count: 0 });
        },
      ),
    },
    fitProfile: {
      findFirst: jest.fn(({ where }: { where: { id: string; customerProfileId: string; isActive: boolean } }) =>
        Promise.resolve(db.fitProfiles.find((f) => f.id === where.id && f.customerProfileId === where.customerProfileId) ?? null),
      ),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.fitProfiles.find((f) => f.id === id) ?? null),
      ),
    },
    fittingService: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(db.fittingServices.filter((s) => where.id.in.includes(s.id as string))),
      ),
    },
    fitMeasurement: {
      findMany: jest.fn(({ where: { fitProfileId } }: { where: { fitProfileId: string } }) =>
        Promise.resolve(db.fitMeasurements.filter((m) => m.fitProfileId === fitProfileId)),
      ),
    },
    existingGarmentRequest: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.existingGarmentRequests.find((x) => x.id === id) ?? null),
      ),
    },
    customStitchingRequest: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.customStitchingRequests.find((x) => x.id === id) ?? null),
      ),
    },
    address: {
      findFirst: jest.fn(
        ({ where }: { where: { id: string; customerProfileId: string; isActive: boolean } }) =>
          Promise.resolve(
            db.addresses.find(
              (a) => a.id === where.id && a.customerProfileId === where.customerProfileId && a.isActive === where.isActive,
            ) ?? null,
          ),
      ),
    },
    cartItem: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const item = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: null,
          quantity: null,
          fitProfileId: null,
          variantId: null,
          productId: null,
          selectedFittingServiceIds: [],
          existingGarmentRequestId: null,
          customStitchingRequestId: null,
          ...data,
        };
        db.cartItems.push(item);
        return Promise.resolve(item);
      }),
      findMany: jest.fn(({ where: { cartId } }: { where: { cartId: string } }) =>
        Promise.resolve(db.cartItems.filter((i) => i.cartId === cartId)),
      ),
      deleteMany: jest.fn(({ where: { cartId } }: { where: { cartId: string } }) => {
        const before = db.cartItems.length;
        for (let i = db.cartItems.length - 1; i >= 0; i -= 1) {
          if (db.cartItems[i]!.cartId === cartId) db.cartItems.splice(i, 1);
        }
        return Promise.resolve({ count: before - db.cartItems.length });
      }),
    },
    order: {
      findUnique: jest.fn(({ where: { idempotencyKey, id } }: { where: { idempotencyKey?: string; id?: string } }) =>
        Promise.resolve(
          db.orders.find((o) => (idempotencyKey ? o.idempotencyKey === idempotencyKey : o.id === id)) ?? null,
        ),
      ),
      findUniqueOrThrow: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const order = db.orders.find((o) => o.id === id);
        if (!order) throw new Error('not found');
        return Promise.resolve(order);
      }),
      findMany: jest.fn(({ where: { customerProfileId } }: { where: { customerProfileId: string } }) =>
        Promise.resolve(db.orders.filter((o) => o.customerProfileId === customerProfileId)),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        if (db.orders.some((o) => o.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        }
        const itemsInput = (data.items as { create: Record<string, unknown>[] }).create;
        const addressInput = (data.addressSnapshot as { create: Record<string, unknown> }).create;
        const historyInput = (data.statusHistory as { create: Record<string, unknown> }).create;
        const order = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
          items: itemsInput.map((i) => ({ id: randomUUID(), createdAt: new Date(), ...i })),
          addressSnapshot: { id: randomUUID(), createdAt: new Date(), ...addressInput },
          statusHistory: [{ id: randomUUID(), createdAt: new Date(), note: null, ...historyInput }],
        };
        db.orders.push(order);
        return Promise.resolve(order);
      }),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const order = db.orders.find((o) => o.id === id)!;
        Object.assign(order, data);
        return Promise.resolve(order);
      }),
    },
    fittingWorkflow: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), status: 'RECEIVED', createdAt: new Date(), updatedAt: new Date(), ...data };
        db.fittingWorkflows.push(row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.fittingWorkflows.find((w) => w.id === id) ?? null),
      ),
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(
          db.fittingWorkflows
            .filter((w) => w.orderId === orderId)
            .map((w) => ({
              ...w,
              actionRequests: db.fittingActionRequests.filter(
                (a) => a.fittingWorkflowId === w.id && a.status === 'PENDING',
              ),
            })),
        ),
      ),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.fittingWorkflows.find((w) => w.id === id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
    },
    fittingStatusHistory: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        db.fittingStatusHistory.push(row);
        return Promise.resolve(row);
      }),
    },
    fittingActionRequest: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const row = db.fittingActionRequests.find((a) => a.id === id);
        if (!row) return Promise.resolve(null);
        const workflow = db.fittingWorkflows.find((w) => w.id === row.fittingWorkflowId);
        return Promise.resolve({ ...row, fittingWorkflow: workflow });
      }),
      update: jest.fn(({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = db.fittingActionRequests.find((a) => a.id === id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
    },
    review: {
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.reviews.filter((r) => r.orderId === orderId)),
      ),
    },
    orderCancellation: {
      findUnique: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.orderCancellations.find((c) => c.orderId === orderId) ?? null),
      ),
    },
    refund: {
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.refunds.filter((r) => r.orderId === orderId)),
      ),
    },
    dispute: {
      findMany: jest.fn(({ where: { orderId } }: { where: { orderId: string } }) =>
        Promise.resolve(db.disputes.filter((d) => d.orderId === orderId)),
      ),
    },
    $transaction: jest.fn((arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return (arg as (tx: unknown) => Promise<unknown>)(client);
    }),
  };

  return { client } as unknown as PrismaService;
}

function buildServices(db: ReturnType<typeof buildDb>) {
  const prisma = buildPrismaMock(db);
  const cartService = new CartService(prisma);
  const cancellationService = new CancellationService(prisma);
  const ordersService = new OrdersService(prisma, cartService, cancellationService);
  return { cartService, ordersService };
}

describe('OrdersService', () => {
  it('places a PRODUCT_ONLY order, decrements stock, and consumes the cart', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);

    const key = randomUUID();
    const { order, created } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: key });

    expect(created).toBe(true);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.type).toBe('PRODUCT_ONLY');
    expect(order.total).toBe(1000);
    expect(order.paymentState).toBe('PENDING');

    const variant = (db.products[0]!.variants as Record<string, unknown>[])[0]!;
    expect(variant.stock).toBe(1);

    const cart = await cartService.getCart('user-1');
    expect(cart.items).toHaveLength(0);
  });

  it('is idempotent: replaying the same key returns the original order without double-decrementing stock', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);

    const key = randomUUID();
    const first = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: key });
    const second = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: key });

    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
    const variant = (db.products[0]!.variants as Record<string, unknown>[])[0]!;
    expect(variant.stock).toBe(1);
  });

  it('rejects checkout when a cart item has insufficient stock', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 2,
    } as never);
    // Stock drops below what's in the cart after it was added.
    (db.products[0]!.variants as Record<string, unknown>[])[0]!.stock = 1;

    await expect(
      ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an EXISTING_GARMENT_FITTING checkout despite its informational pricing-pending issue', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'EXISTING_GARMENT',
      existingGarmentRequestId: 'egr-1',
    } as never);

    const { order, created } = await ordersService.placeOrder('user-1', {
      addressId: 'addr-1',
      idempotencyKey: randomUUID(),
    });

    expect(created).toBe(true);
    expect(order.items[0]!.type).toBe('EXISTING_GARMENT_FITTING');
    expect(order.hasUnpricedItems).toBe(true);
  });

  it('allows a CUSTOM_STITCHING checkout and preserves the quote-required state', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'CUSTOM_STITCHING',
      customStitchingRequestId: 'csr-1',
    } as never);

    const { order } = await ordersService.placeOrder('user-1', {
      addressId: 'addr-1',
      idempotencyKey: randomUUID(),
    });

    expect(order.items[0]!.type).toBe('CUSTOM_STITCHING');
    expect(order.hasUnpricedItems).toBe(true);
    expect(order.items[0]!.lineTotal).toBeNull();
    expect(order.timelineSteps).not.toContain('QUALITY_CHECK');
    expect(order.timelineSteps).toContain('PREPARING_FOR_DELIVERY');
  });

  it('exposes a customer-safe statusMessage and currentStepIndex on order detail', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });

    expect(order.statusMessage).toEqual(expect.any(String));
    expect(order.currentStepIndex).toBe(order.timelineSteps.indexOf('PLACED'));
  });

  it('produces a PRODUCT_WITH_FITTING order for a Buy + Fit checkout', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);

    const { order } = await ordersService.placeOrder('user-1', {
      addressId: 'addr-1',
      idempotencyKey: randomUUID(),
    });

    expect(order.items[0]!.type).toBe('PRODUCT_WITH_FITTING');
    expect(order.fittingSubtotal).toBe(200);
    expect(order.total).toBe(1200);
  });

  it('rejects checkout against an address that does not belong to the customer', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);

    await expect(
      ordersService.placeOrder('user-2', { addressId: 'addr-1', idempotencyKey: randomUUID() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects checkout with an empty cart', async () => {
    const db = buildDb();
    const { ordersService } = buildServices(db);

    await expect(
      ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects fetching another customer's order", async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    const { order } = await ordersService.placeOrder('user-1', {
      addressId: 'addr-1',
      idempotencyKey: randomUUID(),
    });

    await expect(ordersService.getOrder('user-2', order.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an idempotency-key replay from a different customer', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    const key = randomUUID();
    await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: key });

    await expect(
      ordersService.placeOrder('user-2', { addressId: 'addr-1', idempotencyKey: key }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a fitting workflow for a PRODUCT_WITH_FITTING item and exposes it on order detail', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });

    expect(db.fittingWorkflows).toHaveLength(1);
    expect(db.fittingWorkflows[0]!.status).toBe('RECEIVED');
    expect(order.items[0]!.fitting).toEqual({
      status: 'PREPARING',
      message: expect.any(String),
      actionRequired: null,
    });
  });

  it('does not create a fitting workflow for PRODUCT_ONLY', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });

    expect(db.fittingWorkflows).toHaveLength(0);
    expect(order.items[0]!.fitting).toBeNull();
  });

  it('lets the owning customer respond to a pending action request', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });
    const workflowId = db.fittingWorkflows[0]!.id as string;
    db.fittingActionRequests.push({
      id: 'ar-1',
      fittingWorkflowId: workflowId,
      status: 'PENDING',
      requestedInfo: 'Please confirm your sleeve length.',
    });
    Object.assign(db.fittingWorkflows[0]!, { status: 'ACTION_REQUIRED' });

    const result = await ordersService.respondToActionRequest('user-1', order.id, 'ar-1', {
      responseText: '24 inches',
    } as never);

    expect(result.status).toBe('SUBMITTED');
    expect(db.fittingActionRequests[0]!.status).toBe('SUBMITTED');
    expect(db.fittingWorkflows[0]!.status).toBe('INSPECTION');
  });

  it("rejects responding to another customer's action request", async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });
    const workflowId = db.fittingWorkflows[0]!.id as string;
    db.fittingActionRequests.push({ id: 'ar-1', fittingWorkflowId: workflowId, status: 'PENDING', requestedInfo: 'x' });

    await expect(
      ordersService.respondToActionRequest('user-2', order.id, 'ar-1', { responseText: 'hi' } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects submitting a response twice to the same action request', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);
    const { order } = await ordersService.placeOrder('user-1', { addressId: 'addr-1', idempotencyKey: randomUUID() });
    const workflowId = db.fittingWorkflows[0]!.id as string;
    db.fittingActionRequests.push({ id: 'ar-1', fittingWorkflowId: workflowId, status: 'PENDING', requestedInfo: 'x' });

    await ordersService.respondToActionRequest('user-1', order.id, 'ar-1', { responseText: 'first' } as never);
    await expect(
      ordersService.respondToActionRequest('user-1', order.id, 'ar-1', { responseText: 'second' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exposes reviewableTargets and live reorder info only once an order is COMPLETED', async () => {
    const db = buildDb();
    const { cartService, ordersService } = buildServices(db);

    await cartService.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    const { order: placedOrder } = await ordersService.placeOrder('user-1', {
      addressId: 'addr-1',
      idempotencyKey: randomUUID(),
    });

    // Not completed yet — no review/reorder info should be exposed.
    expect(placedOrder.items[0]!.reviewableTargets).toEqual([]);
    expect(placedOrder.items[0]!.reorder).toBeNull();

    db.orders.find((o) => o.id === placedOrder.id)!.status = 'COMPLETED';
    const completed = await ordersService.getOrder('user-1', placedOrder.id);

    expect(completed.items[0]!.reviewableTargets).toEqual([{ targetType: 'PRODUCT', existingReview: null }]);
    expect(completed.items[0]!.reorder).toEqual({ eligible: true, reason: null, currentPrice: 1000 });
  });
});
