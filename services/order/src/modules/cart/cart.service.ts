import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import type { CartDto, CartItemDto, CartItemIssue } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class CartService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCart(userId: string): Promise<CartDto> {
    const { items } = await this.getCartForCheckout(userId);
    return this.summarize(items);
  }

  /** Used by order-service's checkout flow: the same live-validated rows
   * (and their resolved product/fit-profile/etc.) that power the Cart view,
   * plus the raw DB rows and cart/profile ids needed to build Order
   * snapshots and to consume the cart afterward. */
  async getCartForCheckout(userId: string) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const cart = await this.findOrCreateCart(profile.id);

    const rows = await this.prisma.client.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { createdAt: 'asc' },
    });

    const items = await Promise.all(rows.map((row) => this.toItemDto(row, profile.id)));
    return { profile, cart, rows, items };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const cart = await this.findOrCreateCart(profile.id);

    if (dto.type === 'PRODUCT_ONLY' || dto.type === 'BUY_FIT') {
      const { product, variant } = await this.resolveProductAndVariant(
        dto.productId!,
        dto.variantId,
      );
      if (!variant && product.variants.length > 0) {
        throw new BadRequestException({
          code: 'VARIANT_REQUIRED',
          message: 'Select a size/color before adding this to your cart.',
        });
      }
      const stock = variant?.stock;
      if (variant && !variant.isActive) {
        throw new BadRequestException({
          code: 'VARIANT_UNAVAILABLE',
          message: 'This variant is no longer available.',
        });
      }
      if (typeof stock === 'number' && stock < dto.quantity!) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${stock} left in stock.`,
        });
      }

      if (dto.type === 'BUY_FIT') {
        if (!product.isFittingEligible) {
          throw new BadRequestException({
            code: 'NOT_FITTING_ELIGIBLE',
            message: 'This product is not eligible for Buy + Fit.',
          });
        }
        await this.assertFitProfileOwnership(dto.fitProfileId!, profile.id);
        await this.assertFittingServicesUsable(
          dto.selectedFittingServiceIds!,
          product.categoryId,
          dto.fitProfileId!,
        );
      }

      return this.prisma.client.cartItem.create({
        data: {
          cartId: cart.id,
          type: dto.type,
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: dto.quantity,
          fitProfileId: dto.type === 'BUY_FIT' ? dto.fitProfileId : null,
          selectedFittingServiceIds:
            dto.type === 'BUY_FIT' ? (dto.selectedFittingServiceIds ?? []) : [],
          notes: dto.notes || null,
        },
      });
    }

    if (dto.type === 'EXISTING_GARMENT') {
      const request = await this.prisma.client.existingGarmentRequest.findUnique({
        where: { id: dto.existingGarmentRequestId },
      });
      if (!request || request.customerProfileId !== profile.id) {
        throw new ForbiddenException({
          code: 'FITTING_REQUEST_NOT_OWNED',
          message: 'This request does not belong to you.',
        });
      }
      return this.createLinkedItem(cart.id, 'EXISTING_GARMENT', {
        existingGarmentRequestId: request.id,
      });
    }

    // CUSTOM_STITCHING
    const request = await this.prisma.client.customStitchingRequest.findUnique({
      where: { id: dto.customStitchingRequestId },
    });
    if (!request || request.customerProfileId !== profile.id) {
      throw new ForbiddenException({
        code: 'FITTING_REQUEST_NOT_OWNED',
        message: 'This request does not belong to you.',
      });
    }
    return this.createLinkedItem(cart.id, 'CUSTOM_STITCHING', {
      customStitchingRequestId: request.id,
    });
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const item = await this.findOwnedItemOrThrow(profile.id, itemId);

    if (item.type !== 'PRODUCT_ONLY' && item.type !== 'BUY_FIT') {
      throw new BadRequestException({
        code: 'ITEM_NOT_EDITABLE',
        message: "This item's configuration can't be edited here — remove and add it again.",
      });
    }

    if (item.variantId) {
      const variant = await this.prisma.client.productVariant.findUnique({
        where: { id: item.variantId },
      });
      if (variant && variant.stock < quantity) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${variant.stock} left in stock.`,
        });
      }
    }

    return this.prisma.client.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const item = await this.findOwnedItemOrThrow(profile.id, itemId);
    await this.prisma.client.cartItem.delete({ where: { id: item.id } });
  }

  async clearCart(userId: string): Promise<void> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const cart = await this.prisma.client.cart.findUnique({
      where: { customerProfileId: profile.id },
    });
    if (!cart) return;
    await this.prisma.client.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  // ---------------------------------------------------------------------

  private async createLinkedItem(
    cartId: string,
    type: 'EXISTING_GARMENT' | 'CUSTOM_STITCHING',
    ref: { existingGarmentRequestId?: string; customStitchingRequestId?: string },
  ) {
    try {
      return await this.prisma.client.cartItem.create({ data: { cartId, type, ...ref } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException({
          code: 'ALREADY_IN_CART',
          message: 'This request is already in your cart.',
        });
      }
      throw error;
    }
  }

  private async resolveProductAndVariant(productId: string, variantId?: string) {
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, isActive: true },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) {
      throw new BadRequestException({
        code: 'PRODUCT_UNAVAILABLE',
        message: 'This product is no longer available.',
      });
    }
    const variant = variantId ? (product.variants.find((v) => v.id === variantId) ?? null) : null;
    if (variantId && !variant) {
      throw new BadRequestException({
        code: 'VARIANT_UNAVAILABLE',
        message: 'This variant is no longer available.',
      });
    }
    return { product, variant };
  }

  private async assertFitProfileOwnership(fitProfileId: string, customerProfileId: string) {
    const owned = await this.prisma.client.fitProfile.findFirst({
      where: { id: fitProfileId, customerProfileId, isActive: true },
    });
    if (!owned) {
      throw new ForbiddenException({
        code: 'FIT_PROFILE_NOT_OWNED',
        message: 'This fit profile does not belong to you.',
      });
    }
  }

  private async assertFittingServicesUsable(
    serviceIds: string[],
    categoryId: string,
    fitProfileId: string,
  ) {
    const services = await this.prisma.client.fittingService.findMany({
      where: { id: { in: serviceIds }, isActive: true, categories: { some: { categoryId } } },
    });
    if (services.length !== new Set(serviceIds).size) {
      throw new BadRequestException({
        code: 'FITTING_SERVICE_UNAVAILABLE',
        message: 'One or more selected fitting services are no longer available for this product.',
      });
    }

    const measurements = await this.prisma.client.fitMeasurement.findMany({
      where: { fitProfileId },
    });
    const have = new Set(measurements.map((m) => m.key));
    const missing = new Set<string>();
    for (const service of services) {
      for (const key of service.requiredMeasurements) {
        if (!have.has(key)) missing.add(key);
      }
    }
    if (missing.size > 0) {
      throw new BadRequestException({
        code: 'MEASUREMENT_MISSING',
        message: `Your Fit Profile needs: ${[...missing].join(', ')}.`,
      });
    }
  }

  private async findOwnedItemOrThrow(customerProfileId: string, itemId: string) {
    const item = await this.prisma.client.cartItem.findFirst({
      where: { id: itemId, cart: { customerProfileId } },
    });
    if (!item) {
      throw new NotFoundException({ code: 'CART_ITEM_NOT_FOUND', message: 'Cart item not found.' });
    }
    return item;
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'CUSTOMER_PROFILE_NOT_FOUND',
        message: 'Profile not found.',
      });
    }
    return profile;
  }

  private async findOrCreateCart(customerProfileId: string) {
    const existing = await this.prisma.client.cart.findUnique({ where: { customerProfileId } });
    if (existing) return existing;
    return this.prisma.client.cart.create({ data: { customerProfileId } });
  }

  private async toItemDto(
    row: Prisma.CartItemGetPayload<Record<string, never>>,
    customerProfileId: string,
  ): Promise<CartItemDto> {
    const issues: CartItemIssue[] = [];
    const base: CartItemDto = {
      id: row.id,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      product: null,
      variant: null,
      quantity: row.quantity,
      unitPrice: null,
      fitProfile: null,
      selectedFittingServices: [],
      notes: row.notes,
      existingGarment: null,
      customStitching: null,
      lineTotal: null,
      issues: [],
    };

    if (row.type === 'PRODUCT_ONLY' || row.type === 'BUY_FIT') {
      const product = row.productId
        ? await this.prisma.client.product.findUnique({ where: { id: row.productId } })
        : null;
      if (!product || !product.isActive) {
        issues.push({
          code: 'PRODUCT_UNAVAILABLE',
          message: 'This product is no longer available.',
        });
        return { ...base, issues };
      }
      base.product = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
      };

      let unitPrice = product.discountPrice ?? product.price;
      if (row.variantId) {
        const variant = await this.prisma.client.productVariant.findUnique({
          where: { id: row.variantId },
        });
        if (!variant || !variant.isActive) {
          issues.push({
            code: 'VARIANT_UNAVAILABLE',
            message: 'This variant is no longer available.',
          });
        } else {
          base.variant = { id: variant.id, size: variant.size, color: variant.color };
          unitPrice = variant.price ?? unitPrice;
          if (row.quantity && variant.stock < row.quantity) {
            issues.push({
              code: 'INSUFFICIENT_STOCK',
              message:
                variant.stock === 0
                  ? 'This item is out of stock.'
                  : `Only ${variant.stock} left in stock.`,
            });
          }
        }
      }
      base.unitPrice = unitPrice;
      if (row.quantity && issues.every((i) => i.code !== 'VARIANT_UNAVAILABLE')) {
        base.lineTotal = unitPrice * row.quantity;
      }

      if (row.type === 'BUY_FIT') {
        if (row.fitProfileId) {
          const fitProfile = await this.prisma.client.fitProfile.findFirst({
            where: { id: row.fitProfileId, customerProfileId, isActive: true },
          });
          if (!fitProfile) {
            issues.push({
              code: 'FIT_PROFILE_UNAVAILABLE',
              message: 'Your selected Fit Profile is no longer available.',
            });
          } else {
            base.fitProfile = {
              id: fitProfile.id,
              label: fitProfile.label,
              fitPreference: fitProfile.fitPreference,
            };
          }
        }

        const services = await this.prisma.client.fittingService.findMany({
          where: { id: { in: row.selectedFittingServiceIds } },
        });
        const activeServices = services.filter((s) => s.isActive);
        if (activeServices.length !== row.selectedFittingServiceIds.length) {
          issues.push({
            code: 'FITTING_SERVICE_UNAVAILABLE',
            message: 'One of your selected fitting services is no longer available.',
          });
        }
        base.selectedFittingServices = activeServices.map((s) => ({
          id: s.id,
          name: s.name,
          basePrice: s.basePrice,
        }));

        if (row.fitProfileId && base.fitProfile) {
          const measurements = await this.prisma.client.fitMeasurement.findMany({
            where: { fitProfileId: row.fitProfileId },
          });
          const have = new Set(measurements.map((m) => m.key));
          const missing = new Set<string>();
          for (const s of activeServices)
            for (const k of s.requiredMeasurements) if (!have.has(k)) missing.add(k);
          if (missing.size > 0) {
            issues.push({
              code: 'MEASUREMENT_MISSING',
              message: `Your Fit Profile needs one more measurement: ${[...missing].join(', ')}.`,
            });
          }
        }
      }

      return { ...base, issues };
    }

    if (row.type === 'EXISTING_GARMENT') {
      const request = row.existingGarmentRequestId
        ? await this.prisma.client.existingGarmentRequest.findUnique({
            where: { id: row.existingGarmentRequestId },
            include: { photos: true },
          })
        : null;
      if (!request) {
        issues.push({
          code: 'FITTING_REQUEST_UNAVAILABLE',
          message: 'This fitting request is no longer available.',
        });
        return { ...base, issues };
      }
      base.existingGarment = {
        requestId: request.id,
        garmentType: request.garmentType,
        condition: request.condition,
        photoCount: request.photos.length,
      };
      issues.push({
        code: 'PRICING_UNAVAILABLE',
        message: 'Pricing will be confirmed after inspection.',
      });
      return { ...base, issues };
    }

    // CUSTOM_STITCHING
    const request = row.customStitchingRequestId
      ? await this.prisma.client.customStitchingRequest.findUnique({
          where: { id: row.customStitchingRequestId },
        })
      : null;
    if (!request) {
      issues.push({
        code: 'FITTING_REQUEST_UNAVAILABLE',
        message: 'This request is no longer available.',
      });
      return { ...base, issues };
    }
    base.customStitching = { requestId: request.id, garmentType: request.garmentType };
    issues.push({
      code: 'QUOTE_REQUIRED',
      message: 'Quote required — pricing will be confirmed by our team.',
    });
    return { ...base, issues };
  }

  private summarize(items: CartItemDto[]): CartDto {
    const productSubtotal = items
      .filter((i) => i.type === 'PRODUCT_ONLY' || i.type === 'BUY_FIT')
      .reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
    const fittingSubtotal = items.reduce(
      (sum, i) => sum + i.selectedFittingServices.reduce((s, svc) => s + (svc.basePrice ?? 0), 0),
      0,
    );
    const hasUnpricedItems = items.some((i) => {
      if (i.type === 'EXISTING_GARMENT' || i.type === 'CUSTOM_STITCHING') return true;
      if (i.selectedFittingServices.some((s) => s.basePrice === null)) return true;
      return i.lineTotal === null;
    });

    return {
      items,
      productSubtotal,
      fittingSubtotal,
      hasUnpricedItems,
      estimatedTotal: productSubtotal + fittingSubtotal,
    };
  }
}
