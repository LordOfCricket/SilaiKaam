import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReorderService } from './reorder.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    products: [
      {
        id: 'product-1',
        isActive: true,
        isFittingEligible: true,
        categoryId: 'cat-1',
        price: 1000,
        discountPrice: null,
        variants: [{ id: 'variant-1', productId: 'product-1', isActive: true, stock: 5, size: 'M', color: 'Blue', price: null }],
      },
    ] as Record<string, unknown>[],
    fitProfiles: [
      { id: 'fp-1', customerProfileId: CUSTOMER_PROFILE_ID, isActive: true, label: 'My Fit', fitPreference: 'REGULAR' },
    ] as Record<string, unknown>[],
    fitMeasurements: [{ fitProfileId: 'fp-1', key: 'CHEST' }] as Record<string, unknown>[],
    fittingServices: [
      {
        id: 'fs-1',
        isActive: true,
        name: 'Chest alteration',
        basePrice: null,
        requiredMeasurements: ['CHEST'],
        categories: [{ categoryId: 'cat-1' }],
      },
    ] as Record<string, unknown>[],
    carts: [] as Record<string, unknown>[],
    cartItems: [] as Record<string, unknown>[],
    orders: [] as Record<string, unknown>[],
  };
}

function seedOrder(db: ReturnType<typeof buildDb>, item: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}) {
  const order = { id: randomUUID(), customerProfileId: CUSTOMER_PROFILE_ID, status: 'COMPLETED', items: [item], ...overrides };
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
    },
    product: {
      findFirst: jest.fn(({ where }: { where: { id: string; isActive: boolean } }) =>
        Promise.resolve(db.products.find((p) => p.id === where.id && p.isActive === where.isActive) ?? null),
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
    },
    fitProfile: {
      findFirst: jest.fn(({ where }: { where: { customerProfileId?: string; id?: string; isActive: boolean } }) =>
        Promise.resolve(
          db.fitProfiles.find(
            (f) =>
              (where.customerProfileId ? f.customerProfileId === where.customerProfileId : f.id === where.id) &&
              f.isActive === where.isActive,
          ) ?? null,
        ),
      ),
    },
    fittingService: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] }; isActive?: boolean; categories?: { some: { categoryId: string } } } }) =>
        Promise.resolve(
          db.fittingServices.filter((s) => {
            const svc = s as { id: string; isActive: boolean; categories: { categoryId: string }[] };
            if (!where.id.in.includes(svc.id)) return false;
            if (where.isActive !== undefined && svc.isActive !== where.isActive) return false;
            if (where.categories && !svc.categories.some((c) => c.categoryId === where.categories!.some.categoryId)) return false;
            return true;
          }),
        ),
      ),
    },
    fitMeasurement: {
      findMany: jest.fn(({ where: { fitProfileId } }: { where: { fitProfileId: string } }) =>
        Promise.resolve(db.fitMeasurements.filter((m) => m.fitProfileId === fitProfileId)),
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
    cartItem: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const item = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
        db.cartItems.push(item);
        return Promise.resolve(item);
      }),
    },
  };
  return { client } as unknown as PrismaService;
}

function buildServices(db: ReturnType<typeof buildDb>) {
  const prisma = buildPrismaMock(db);
  const cartService = new CartService(prisma);
  const reorderService = new ReorderService(prisma, cartService);
  return { reorderService };
}

describe('ReorderService', () => {
  it('Buy Again creates a new CartItem for PRODUCT_ONLY using current stock', async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'product-1', variantId: 'variant-1', quantity: 2 };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    const result = await reorderService.reorder('user-1', order.id, item.id);

    expect(result).toEqual({ kind: 'ADDED_TO_CART' });
    expect(db.cartItems).toHaveLength(1);
    expect(db.cartItems[0]!.quantity).toBe(2);
  });

  it('rejects Buy Again when the product no longer exists/is inactive', async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'gone', variantId: null, quantity: 1 };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-1', order.id, item.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects Buy Again when the variant is no longer available', async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'product-1', variantId: 'gone-variant', quantity: 1 };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-1', order.id, item.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('Buy + Fit Again reuses the current Fit Profile', async () => {
    const db = buildDb();
    const item = {
      id: randomUUID(),
      type: 'PRODUCT_WITH_FITTING',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fittingServicesSnapshot: [{ id: 'fs-1', name: 'Chest alteration', basePrice: null }],
    };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    const result = await reorderService.reorder('user-1', order.id, item.id);
    expect(result).toEqual({ kind: 'ADDED_TO_CART' });
    expect(db.cartItems[0]!.fitProfileId).toBe('fp-1');
  });

  it('blocks Buy + Fit Again when the Fit Profile no longer has the required measurement', async () => {
    const db = buildDb();
    db.fitMeasurements = []; // measurement removed since original order
    const item = {
      id: randomUUID(),
      type: 'PRODUCT_WITH_FITTING',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fittingServicesSnapshot: [{ id: 'fs-1', name: 'Chest alteration', basePrice: null }],
    };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-1', order.id, item.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks Buy + Fit Again when no Fit Profile exists', async () => {
    const db = buildDb();
    db.fitProfiles = [];
    const item = {
      id: randomUUID(),
      type: 'PRODUCT_WITH_FITTING',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fittingServicesSnapshot: [{ id: 'fs-1', name: 'Chest alteration', basePrice: null }],
    };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-1', order.id, item.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a prefill (not a cart add) for EXISTING_GARMENT_FITTING', async () => {
    const db = buildDb();
    const item = {
      id: randomUUID(),
      type: 'EXISTING_GARMENT_FITTING',
      garmentType: 'Shirt',
      garmentCondition: 'GOOD',
      garmentBrand: 'Acme',
      fittingServicesSnapshot: [{ id: 'fs-1', name: 'Chest alteration', basePrice: null }],
    };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    const result = await reorderService.reorder('user-1', order.id, item.id);
    expect(result.kind).toBe('PREFILL');
    expect(db.cartItems).toHaveLength(0);
  });

  it('rejects reordering before the order is completed', async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'product-1', variantId: 'variant-1', quantity: 1 };
    const order = seedOrder(db, item, { status: 'OUT_FOR_DELIVERY' });
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-1', order.id, item.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects reordering another customer's order", async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'product-1', variantId: 'variant-1', quantity: 1 };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);

    await expect(reorderService.reorder('user-2', order.id, item.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('leaves the original order untouched after a reorder', async () => {
    const db = buildDb();
    const item = { id: randomUUID(), type: 'PRODUCT_ONLY', productId: 'product-1', variantId: 'variant-1', quantity: 3 };
    const order = seedOrder(db, item);
    const { reorderService } = buildServices(db);
    const snapshot = JSON.stringify(order);

    await reorderService.reorder('user-1', order.id, item.id);

    expect(JSON.stringify(db.orders.find((o) => o.id === order.id))).toBe(snapshot);
  });
});
