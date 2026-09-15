import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import type { WishlistItemDto } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const PRODUCT_INCLUDE = { category: true, variants: true } satisfies Prisma.ProductInclude;
type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

/** Wishlist items are references only — `product` is always resolved from
 * CURRENT catalog data (never a saved price/availability snapshot). */
@Injectable()
export class WishlistService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<WishlistItemDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const items = await this.prisma.client.wishlistItem.findMany({
      where: { customerProfileId: profile.id },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item));
  }

  async add(userId: string, productId: string): Promise<WishlistItemDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
    }

    try {
      const item = await this.prisma.client.wishlistItem.create({
        data: { customerProfileId: profile.id, productId },
        include: { product: { include: PRODUCT_INCLUDE } },
      });
      return this.toDto(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        // Already saved — idempotent, return the existing row rather than erroring.
        const existing = await this.prisma.client.wishlistItem.findUniqueOrThrow({
          where: { customerProfileId_productId: { customerProfileId: profile.id, productId } },
          include: { product: { include: PRODUCT_INCLUDE } },
        });
        return this.toDto(existing);
      }
      throw error;
    }
  }

  async remove(userId: string, productId: string): Promise<void> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    // deleteMany (not delete) so a repeated/duplicate remove is a safe no-op.
    await this.prisma.client.wishlistItem.deleteMany({ where: { customerProfileId: profile.id, productId } });
  }

  private toDto(item: { id: string; productId: string; createdAt: Date; product: ProductWithRelations }): WishlistItemDto {
    const { product } = item;
    return {
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt.toISOString(),
      available: product.isActive,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discountPrice: product.discountPrice,
        currency: product.currency,
        imageUrl: product.imageUrl,
        availability: product.availability,
        category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
        description: product.description,
        sizes: product.sizes,
        colors: product.colors,
        isFittingEligible: product.isFittingEligible,
        variants: product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          price: v.price ?? product.price,
          stock: v.stock,
          inStock: v.isActive && v.stock > 0,
        })),
      },
    };
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }
    return profile;
  }
}
