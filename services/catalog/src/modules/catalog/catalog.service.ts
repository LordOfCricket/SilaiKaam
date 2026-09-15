import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@silaikaam/database';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.client.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
  }

  async listProducts(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) where.category = { slug: query.category };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    if (query.size) where.sizes = { has: query.size };
    if (query.color) where.colors = { has: query.color };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.client.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.client.product.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findProductBySlug(slug: string) {
    const product = await this.prisma.client.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true }, orderBy: [{ size: 'asc' }, { color: 'asc' }] },
      },
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }

    const basePrice = product.discountPrice ?? product.price;
    const { variants, ...rest } = product;
    return {
      ...rest,
      variants: variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        price: v.price ?? basePrice,
        stock: v.stock,
        inStock: v.stock > 0,
      })),
    };
  }

  /** All active fitting services, unscoped by product/category — used by
   * the Existing Garment Fitting journey, which has no catalog product to
   * derive a category from. */
  async listAllFittingServices() {
    const services = await this.prisma.client.fittingService.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return services.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      description: s.description,
      requiredMeasurements: s.requiredMeasurements,
      basePrice: s.basePrice,
    }));
  }

  /** Fitting services applicable to this product's category — empty unless
   * the product is explicitly flagged fitting-eligible (Phase 8: eligibility
   * is data-driven, never inferred client-side). */
  async listFittingServicesForProduct(slug: string) {
    const product = await this.prisma.client.product.findFirst({
      where: { slug, isActive: true },
      select: { id: true, categoryId: true, isFittingEligible: true },
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }
    if (!product.isFittingEligible) return [];

    const services = await this.prisma.client.fittingService.findMany({
      where: { isActive: true, categories: { some: { categoryId: product.categoryId } } },
      orderBy: { name: 'asc' },
    });

    return services.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      description: s.description,
      requiredMeasurements: s.requiredMeasurements,
      basePrice: s.basePrice,
    }));
  }
}
