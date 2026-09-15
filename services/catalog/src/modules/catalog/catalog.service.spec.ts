import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';

const CATEGORY = { id: 'cat-1', name: 'Shirts', slug: 'shirts' };
const VARIANTS_P1 = [
  { id: 'v1', productId: 'p1', size: 'M', color: 'blue', price: null, stock: 5, isActive: true },
  { id: 'v2', productId: 'p1', size: 'L', color: 'blue', price: 1099, stock: 0, isActive: true },
];
const PRODUCTS = [
  {
    id: 'p1',
    name: 'Cotton Shirt',
    slug: 'cotton-shirt',
    price: 999,
    discountPrice: null,
    sizes: ['M', 'L'],
    colors: ['blue'],
    categoryId: 'cat-1',
    category: CATEGORY,
    isActive: true,
    isFittingEligible: true,
    createdAt: new Date('2024-01-01'),
    variants: VARIANTS_P1,
  },
  {
    id: 'p2',
    name: 'Linen Shirt',
    slug: 'linen-shirt',
    price: 1999,
    discountPrice: null,
    sizes: ['S'],
    colors: ['white'],
    categoryId: 'cat-1',
    category: CATEGORY,
    isActive: true,
    isFittingEligible: false,
    createdAt: new Date('2024-02-01'),
    variants: [],
  },
];
const FITTING_SERVICES = [
  {
    id: 'fs1',
    type: 'SLEEVE_ALTERATION',
    name: 'Sleeve alteration',
    description: null,
    requiredMeasurements: ['SLEEVE'],
    basePrice: null,
    isActive: true,
  },
];

function buildPrismaMock() {
  return {
    client: {
      category: { findMany: jest.fn().mockResolvedValue([CATEGORY]) },
      product: {
        findMany: jest.fn(
          ({
            where,
            orderBy,
            skip,
            take,
          }: {
            where: {
              price?: { gte?: number; lte?: number };
              sizes?: { has: string };
              OR?: { name: { contains: string } }[];
            };
            orderBy: { price?: string; createdAt?: string };
            skip: number;
            take: number;
          }) => {
            let results = PRODUCTS.filter((p) => p.isActive);
            if (where.price?.gte !== undefined)
              results = results.filter((p) => p.price >= where.price!.gte!);
            if (where.price?.lte !== undefined)
              results = results.filter((p) => p.price <= where.price!.lte!);
            if (where.sizes) results = results.filter((p) => p.sizes.includes(where.sizes!.has));
            if (where.OR?.[0]) {
              const needle = where.OR[0].name.contains.toLowerCase();
              results = results.filter((p) => p.name.toLowerCase().includes(needle));
            }
            if (orderBy.price === 'asc') results = [...results].sort((a, b) => a.price - b.price);
            if (orderBy.price === 'desc') results = [...results].sort((a, b) => b.price - a.price);
            return Promise.resolve(results.slice(skip, skip + take));
          },
        ),
        count: jest.fn().mockImplementation(() => Promise.resolve(PRODUCTS.length)),
        findFirst: jest.fn(({ where: { slug } }: { where: { slug: string } }) =>
          Promise.resolve(PRODUCTS.find((p) => p.slug === slug) ?? null),
        ),
      },
      fittingService: {
        findMany: jest.fn(
          ({
            where,
          }: {
            where: { isActive: boolean; categories?: { some: { categoryId: string } } };
          }) =>
            Promise.resolve(
              FITTING_SERVICES.filter(
                (s) =>
                  s.isActive === where.isActive &&
                  (!where.categories || where.categories.some.categoryId === 'cat-1'),
              ),
            ),
        ),
      },
    },
  } as unknown as PrismaService;
}

function query(overrides: Partial<ProductQueryDto> = {}): ProductQueryDto {
  return Object.assign(new ProductQueryDto(), {
    sort: 'relevance',
    page: 1,
    limit: 12,
    ...overrides,
  });
}

describe('CatalogService', () => {
  it('lists active categories', async () => {
    const service = new CatalogService(buildPrismaMock());
    expect(await service.listCategories()).toEqual([CATEGORY]);
  });

  it('sorts products by price ascending', async () => {
    const service = new CatalogService(buildPrismaMock());
    const result = await service.listProducts(query({ sort: 'price_asc' }));
    expect(result.items.map((p) => p.slug)).toEqual(['cotton-shirt', 'linen-shirt']);
  });

  it('filters by size', async () => {
    const service = new CatalogService(buildPrismaMock());
    const result = await service.listProducts(query({ size: 'S' }));
    expect(result.items.map((p) => p.slug)).toEqual(['linen-shirt']);
  });

  it('filters by search query', async () => {
    const service = new CatalogService(buildPrismaMock());
    const result = await service.listProducts(query({ q: 'linen' }));
    expect(result.items.map((p) => p.slug)).toEqual(['linen-shirt']);
  });

  it('returns an empty result set for a query that matches nothing', async () => {
    const service = new CatalogService(buildPrismaMock());
    const result = await service.listProducts(query({ q: 'nonexistent-product-xyz' }));
    expect(result.items).toEqual([]);
  });

  it('throws NotFoundException for an unknown slug', async () => {
    const service = new CatalogService(buildPrismaMock());
    await expect(service.findProductBySlug('does-not-exist')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps variants with effective price and stock-derived availability', async () => {
    const service = new CatalogService(buildPrismaMock());
    const product = await service.findProductBySlug('cotton-shirt');

    expect(product.variants).toEqual([
      { id: 'v1', size: 'M', color: 'blue', price: 999, stock: 5, inStock: true },
      { id: 'v2', size: 'L', color: 'blue', price: 1099, stock: 0, inStock: false },
    ]);
  });

  it('returns an empty variants array for a product with none configured', async () => {
    const service = new CatalogService(buildPrismaMock());
    const product = await service.findProductBySlug('linen-shirt');
    expect(product.variants).toEqual([]);
  });

  it('lists fitting services only for a fitting-eligible product', async () => {
    const service = new CatalogService(buildPrismaMock());
    const services = await service.listFittingServicesForProduct('cotton-shirt');
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ type: 'SLEEVE_ALTERATION', basePrice: null });
  });

  it('returns no fitting services for a non-eligible product', async () => {
    const service = new CatalogService(buildPrismaMock());
    const services = await service.listFittingServicesForProduct('linen-shirt');
    expect(services).toEqual([]);
  });

  it('lists all active fitting services unscoped by category', async () => {
    const service = new CatalogService(buildPrismaMock());
    const services = await service.listAllFittingServices();
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({ type: 'SLEEVE_ALTERATION' });
  });

  it('throws NotFoundException for fitting services on an unknown slug', async () => {
    const service = new CatalogService(buildPrismaMock());
    await expect(service.listFittingServicesForProduct('does-not-exist')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
