import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  const products: Record<string, unknown>[] = [
    {
      id: 'product-1',
      isActive: true,
      isFittingEligible: true,
      categoryId: 'cat-1',
      price: 1000,
      discountPrice: null,
      variants: [
        {
          id: 'variant-1',
          productId: 'product-1',
          isActive: true,
          stock: 2,
          size: 'M',
          color: 'Blue',
          price: null,
        },
      ],
    },
    {
      id: 'product-novariant',
      isActive: true,
      isFittingEligible: false,
      categoryId: 'cat-1',
      price: 500,
      discountPrice: null,
      variants: [],
    },
  ];
  const fitProfiles: Record<string, unknown>[] = [
    {
      id: 'fp-1',
      customerProfileId: CUSTOMER_PROFILE_ID,
      isActive: true,
      label: 'My Fit',
      fitPreference: 'REGULAR',
    },
    {
      id: 'fp-other',
      customerProfileId: OTHER_CUSTOMER_PROFILE_ID,
      isActive: true,
      label: 'Other Fit',
      fitPreference: 'REGULAR',
    },
  ];
  const fitMeasurements: Record<string, unknown>[] = [{ fitProfileId: 'fp-1', key: 'CHEST' }];
  const fittingServices: Record<string, unknown>[] = [
    {
      id: 'fs-1',
      isActive: true,
      name: 'Chest alteration',
      basePrice: null,
      requiredMeasurements: ['CHEST'],
      categories: [{ categoryId: 'cat-1' }],
    },
    {
      id: 'fs-missing',
      isActive: true,
      name: 'Sleeve alteration',
      basePrice: null,
      requiredMeasurements: ['SLEEVE'],
      categories: [{ categoryId: 'cat-1' }],
    },
  ];
  const carts: Record<string, unknown>[] = [];
  const cartItems: Record<string, unknown>[] = [];
  const existingGarmentRequests: Record<string, unknown>[] = [
    {
      id: 'egr-1',
      customerProfileId: CUSTOMER_PROFILE_ID,
      garmentType: 'Shirt',
      condition: 'GOOD',
      photos: [{ id: 'p1' }],
    },
  ];
  const customStitchingRequests: Record<string, unknown>[] = [
    { id: 'csr-1', customerProfileId: CUSTOMER_PROFILE_ID, garmentType: 'Kurta' },
  ];

  return {
    products,
    fitProfiles,
    fitMeasurements,
    fittingServices,
    carts,
    cartItems,
    existingGarmentRequests,
    customStitchingRequests,
  };
}

function buildPrismaMock(db: ReturnType<typeof buildDb>) {
  const client = {
    customerProfile: {
      findUnique: jest.fn(({ where: { userId } }: { where: { userId: string } }) =>
        Promise.resolve(
          userId === 'user-1'
            ? { id: CUSTOMER_PROFILE_ID }
            : userId === 'user-2'
              ? { id: OTHER_CUSTOMER_PROFILE_ID }
              : null,
        ),
      ),
    },
    cart: {
      findUnique: jest.fn(
        ({ where: { customerProfileId } }: { where: { customerProfileId: string } }) =>
          Promise.resolve(db.carts.find((c) => c.customerProfileId === customerProfileId) ?? null),
      ),
      create: jest.fn(({ data }: { data: { customerProfileId: string } }) => {
        const cart = { id: randomUUID(), ...data };
        db.carts.push(cart);
        return Promise.resolve(cart);
      }),
    },
    product: {
      findFirst: jest.fn(({ where }: { where: { id: string; isActive: boolean } }) => {
        const p = db.products.find(
          (x) =>
            (x as { id: string }).id === where.id &&
            (x as { isActive: boolean }).isActive === where.isActive,
        );
        return Promise.resolve(p ?? null);
      }),
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.products.find((p) => (p as { id: string }).id === id) ?? null),
      ),
    },
    productVariant: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        for (const p of db.products) {
          const v = (p as { variants: { id: string }[] }).variants.find((x) => x.id === id);
          if (v) return Promise.resolve(v);
        }
        return Promise.resolve(null);
      }),
    },
    fitProfile: {
      findFirst: jest.fn(
        ({ where }: { where: { id: string; customerProfileId: string; isActive: boolean } }) =>
          Promise.resolve(
            db.fitProfiles.find(
              (f) =>
                (f as { id: string }).id === where.id &&
                (f as { customerProfileId: string }).customerProfileId === where.customerProfileId,
            ) ?? null,
          ),
      ),
    },
    fittingService: {
      findMany: jest.fn(
        ({
          where,
        }: {
          where: {
            id: { in: string[] };
            isActive?: boolean;
            categories?: { some: { categoryId: string } };
          };
        }) =>
          Promise.resolve(
            db.fittingServices.filter((s) => {
              const svc = s as {
                id: string;
                isActive: boolean;
                categories: { categoryId: string }[];
              };
              if (!where.id.in.includes(svc.id)) return false;
              if (where.isActive !== undefined && svc.isActive !== where.isActive) return false;
              if (
                where.categories &&
                !svc.categories.some((c) => c.categoryId === where.categories!.some.categoryId)
              )
                return false;
              return true;
            }),
          ),
      ),
    },
    fitMeasurement: {
      findMany: jest.fn(({ where: { fitProfileId } }: { where: { fitProfileId: string } }) =>
        Promise.resolve(
          db.fitMeasurements.filter(
            (m) => (m as { fitProfileId: string }).fitProfileId === fitProfileId,
          ),
        ),
      ),
    },
    existingGarmentRequest: {
      findUnique: jest.fn(
        ({ where: { id }, include }: { where: { id: string }; include?: unknown }) => {
          const r = db.existingGarmentRequests.find((x) => (x as { id: string }).id === id);
          if (!r) return Promise.resolve(null);
          return Promise.resolve(include ? r : { ...r, photos: undefined });
        },
      ),
    },
    customStitchingRequest: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(
          db.customStitchingRequests.find((x) => (x as { id: string }).id === id) ?? null,
        ),
      ),
    },
    cartItem: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        if (
          data.existingGarmentRequestId &&
          db.cartItems.some((i) => i.existingGarmentRequestId === data.existingGarmentRequestId)
        ) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        }
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
        Promise.resolve(db.cartItems.filter((i) => (i as { cartId: string }).cartId === cartId)),
      ),
      findFirst: jest.fn(
        ({ where }: { where: { id: string; cart: { customerProfileId: string } } }) => {
          const item = db.cartItems.find((i) => (i as { id: string }).id === where.id);
          if (!item) return Promise.resolve(null);
          const cart = db.carts.find(
            (c) => (c as { id: string }).id === (item as { cartId: string }).cartId,
          );
          if (
            !cart ||
            (cart as { customerProfileId: string }).customerProfileId !==
              where.cart.customerProfileId
          )
            return Promise.resolve(null);
          return Promise.resolve(item);
        },
      ),
      update: jest.fn(
        ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const item = db.cartItems.find((i) => (i as { id: string }).id === id)!;
          Object.assign(item, data);
          return Promise.resolve(item);
        },
      ),
      delete: jest.fn(({ where: { id } }: { where: { id: string } }) => {
        const idx = db.cartItems.findIndex((i) => (i as { id: string }).id === id);
        if (idx >= 0) db.cartItems.splice(idx, 1);
        return Promise.resolve({});
      }),
      deleteMany: jest.fn(({ where: { cartId } }: { where: { cartId: string } }) => {
        const before = db.cartItems.length;
        for (let i = db.cartItems.length - 1; i >= 0; i -= 1) {
          if ((db.cartItems[i] as { cartId: string }).cartId === cartId) db.cartItems.splice(i, 1);
        }
        return Promise.resolve({ count: before - db.cartItems.length });
      }),
    },
  };

  return { client } as unknown as PrismaService;
}

describe('CartService', () => {
  it('adds a PRODUCT_ONLY item with a valid variant', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const item = await service.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    expect(item).toMatchObject({
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
    });
  });

  it('rejects adding a product with insufficient stock', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await expect(
      service.addItem('user-1', {
        type: 'PRODUCT_ONLY',
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 5,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a variant when the product has configured variants', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await expect(
      service.addItem('user-1', {
        type: 'PRODUCT_ONLY',
        productId: 'product-1',
        quantity: 1,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds a BUY_FIT item when the fit profile has the required measurement', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const item = await service.addItem('user-1', {
      type: 'BUY_FIT',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
      fitProfileId: 'fp-1',
      selectedFittingServiceIds: ['fs-1'],
    } as never);
    expect(item).toMatchObject({ type: 'BUY_FIT', fitProfileId: 'fp-1' });
  });

  it('rejects BUY_FIT when a required measurement is missing', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await expect(
      service.addItem('user-1', {
        type: 'BUY_FIT',
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 1,
        fitProfileId: 'fp-1',
        selectedFittingServiceIds: ['fs-missing'],
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects using another customer's fit profile", async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await expect(
      service.addItem('user-1', {
        type: 'BUY_FIT',
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 1,
        fitProfileId: 'fp-other',
        selectedFittingServiceIds: ['fs-1'],
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds an EXISTING_GARMENT item referencing an owned request', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const item = await service.addItem('user-1', {
      type: 'EXISTING_GARMENT',
      existingGarmentRequestId: 'egr-1',
    } as never);
    expect(item).toMatchObject({ type: 'EXISTING_GARMENT', existingGarmentRequestId: 'egr-1' });
  });

  it('rejects an EXISTING_GARMENT request owned by another customer', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await expect(
      service.addItem('user-2', {
        type: 'EXISTING_GARMENT',
        existingGarmentRequestId: 'egr-1',
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects adding the same EXISTING_GARMENT request twice', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await service.addItem('user-1', {
      type: 'EXISTING_GARMENT',
      existingGarmentRequestId: 'egr-1',
    } as never);
    await expect(
      service.addItem('user-1', {
        type: 'EXISTING_GARMENT',
        existingGarmentRequestId: 'egr-1',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds a CUSTOM_STITCHING item and surfaces quote-required in the cart', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await service.addItem('user-1', {
      type: 'CUSTOM_STITCHING',
      customStitchingRequestId: 'csr-1',
    } as never);
    const cart = await service.getCart('user-1');

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ type: 'CUSTOM_STITCHING' });
    expect(cart.items[0]!.issues).toContainEqual(
      expect.objectContaining({ code: 'QUOTE_REQUIRED' }),
    );
    expect(cart.hasUnpricedItems).toBe(true);
  });

  it('computes an honest cart summary for a PRODUCT_ONLY item', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    await service.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 2,
    } as never);
    const cart = await service.getCart('user-1');

    expect(cart.items[0]!.lineTotal).toBe(2000);
    expect(cart.productSubtotal).toBe(2000);
    expect(cart.hasUnpricedItems).toBe(false);
  });

  it('removes an owned item', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const item = await service.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    await service.removeItem('user-1', (item as { id: string }).id);
    const cart = await service.getCart('user-1');
    expect(cart.items).toHaveLength(0);
  });

  it('rejects removing an item that belongs to another customer', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const item = await service.addItem('user-1', {
      type: 'PRODUCT_ONLY',
      productId: 'product-1',
      variantId: 'variant-1',
      quantity: 1,
    } as never);
    await expect(service.removeItem('user-2', (item as { id: string }).id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns an empty cart summary when nothing has been added', async () => {
    const db = buildDb();
    const service = new CartService(buildPrismaMock(db));

    const cart = await service.getCart('user-1');
    expect(cart).toMatchObject({
      items: [],
      productSubtotal: 0,
      fittingSubtotal: 0,
      estimatedTotal: 0,
    });
  });
});
