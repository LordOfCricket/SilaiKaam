import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WishlistService } from './wishlist.service';

const CUSTOMER_PROFILE_ID = 'profile-1';
const OTHER_CUSTOMER_PROFILE_ID = 'profile-2';

function buildDb() {
  return {
    products: [
      {
        id: 'product-1',
        name: 'Shirt',
        slug: 'shirt',
        price: 1000,
        discountPrice: null,
        currency: 'INR',
        imageUrl: null,
        availability: 'IN_STOCK',
        description: null,
        sizes: ['M'],
        colors: ['Blue'],
        isFittingEligible: false,
        isActive: true,
        category: { id: 'cat-1', name: 'Shirts', slug: 'shirts' },
        variants: [{ id: 'variant-1', size: 'M', color: 'Blue', price: null, stock: 5, isActive: true }],
      },
    ] as Record<string, unknown>[],
    wishlistItems: [] as Record<string, unknown>[],
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
    product: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(db.products.find((p) => p.id === id) ?? null),
      ),
    },
    wishlistItem: {
      findMany: jest.fn(({ where: { customerProfileId } }: { where: { customerProfileId: string } }) =>
        Promise.resolve(
          db.wishlistItems
            .filter((i) => i.customerProfileId === customerProfileId)
            .map((i) => ({ ...i, product: db.products.find((p) => p.id === i.productId) })),
        ),
      ),
      findUniqueOrThrow: jest.fn(
        ({
          where: {
            customerProfileId_productId: { customerProfileId, productId },
          },
        }: {
          where: { customerProfileId_productId: { customerProfileId: string; productId: string } };
        }) => {
          const item = db.wishlistItems.find((i) => i.customerProfileId === customerProfileId && i.productId === productId);
          if (!item) throw new Error('not found');
          return Promise.resolve({ ...item, product: db.products.find((p) => p.id === item.productId) });
        },
      ),
      create: jest.fn(({ data }: { data: { customerProfileId: string; productId: string } }) => {
        if (db.wishlistItems.some((i) => i.customerProfileId === data.customerProfileId && i.productId === data.productId)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        }
        const item = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
        db.wishlistItems.push(item);
        return Promise.resolve({ ...item, product: db.products.find((p) => p.id === item.productId) });
      }),
      deleteMany: jest.fn(({ where }: { where: { customerProfileId: string; productId: string } }) => {
        const before = db.wishlistItems.length;
        db.wishlistItems = db.wishlistItems.filter(
          (i) => !(i.customerProfileId === where.customerProfileId && i.productId === where.productId),
        );
        return Promise.resolve({ count: before - db.wishlistItems.length });
      }),
    },
  };
  return { client } as unknown as PrismaService;
}

describe('WishlistService', () => {
  it('saves a product', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    const item = await service.add('user-1', 'product-1');
    expect(item.productId).toBe('product-1');
    expect(item.available).toBe(true);
    expect(item.product.name).toBe('Shirt');
  });

  it('prevents a duplicate save (idempotent, returns the existing item)', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    const first = await service.add('user-1', 'product-1');
    const second = await service.add('user-1', 'product-1');
    expect(second.id).toBe(first.id);
    expect(db.wishlistItems).toHaveLength(1);
  });

  it('rejects saving a product that does not exist', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    await expect(service.add('user-1', 'missing-product')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists saved products with current data', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    await service.add('user-1', 'product-1');
    const list = await service.list('user-1');
    expect(list).toHaveLength(1);
    expect(list[0]!.product.price).toBe(1000);
  });

  it('reflects an inactive product as unavailable', async () => {
    const db = buildDb();
    db.products[0]!.isActive = false;
    const service = new WishlistService(buildPrismaMock(db));
    await service.add('user-1', 'product-1');
    const list = await service.list('user-1');
    expect(list[0]!.available).toBe(false);
  });

  it('removes a saved product (duplicate remove is a safe no-op)', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    await service.add('user-1', 'product-1');
    await service.remove('user-1', 'product-1');
    await service.remove('user-1', 'product-1'); // duplicate remove
    const list = await service.list('user-1');
    expect(list).toHaveLength(0);
  });

  it('isolates wishlists between customers', async () => {
    const db = buildDb();
    const service = new WishlistService(buildPrismaMock(db));
    await service.add('user-1', 'product-1');
    const otherList = await service.list('user-2');
    expect(otherList).toHaveLength(0);
  });
});
