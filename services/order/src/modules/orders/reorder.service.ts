import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ReorderResultDto } from '@silaikaam/types';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * "Buy Again"/"Repeat Fit" — always goes through the existing Cart system
 * (CartService.addItem already revalidates product/variant/stock/fit-profile
 * /fitting-service availability against CURRENT data; nothing here trusts
 * the historical order snapshot for anything but which product/service to
 * re-add). Existing Garment and Custom Stitching require fresh customer
 * input (photos) that can't be cloned, so those return prefill data for the
 * existing request forms instead of silently fabricating a cart item.
 */
@Injectable()
export class ReorderService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CartService) private readonly cartService: CartService,
  ) {}

  async reorder(userId: string, orderId: string, orderItemId: string): Promise<ReorderResultDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException({
        code: 'ORDER_NOT_COMPLETED',
        message: 'You can reorder from this order once it has been completed.',
      });
    }
    const item = order.items.find((i) => i.id === orderItemId);
    if (!item) {
      throw new NotFoundException({ code: 'ORDER_ITEM_NOT_FOUND', message: 'Order item not found.' });
    }

    if (item.type === 'PRODUCT_ONLY') {
      await this.cartService.addItem(userId, {
        type: 'PRODUCT_ONLY',
        productId: item.productId!,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity ?? 1,
      } as never);
      return { kind: 'ADDED_TO_CART' };
    }

    if (item.type === 'PRODUCT_WITH_FITTING') {
      const fitProfile = await this.prisma.client.fitProfile.findFirst({
        where: { customerProfileId: profile.id, isActive: true },
      });
      if (!fitProfile) {
        throw new BadRequestException({
          code: 'FIT_PROFILE_MISSING',
          message: 'Set up your Fit Profile before repeating this fitting.',
        });
      }
      const fittingServiceIds = this.extractServiceIds(item.fittingServicesSnapshot);
      await this.cartService.addItem(userId, {
        type: 'BUY_FIT',
        productId: item.productId!,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity ?? 1,
        fitProfileId: fitProfile.id,
        selectedFittingServiceIds: fittingServiceIds,
      } as never);
      return { kind: 'ADDED_TO_CART' };
    }

    const fitProfile = await this.prisma.client.fitProfile.findFirst({
      where: { customerProfileId: profile.id, isActive: true },
    });

    if (item.type === 'EXISTING_GARMENT_FITTING') {
      return {
        kind: 'PREFILL',
        itemType: 'EXISTING_GARMENT_FITTING',
        prefill: {
          garmentType: item.garmentType ?? '',
          condition: item.garmentCondition,
          brand: item.garmentBrand,
          currentSize: null,
          fabricDetails: null,
          designDetails: null,
          color: null,
          specialRequirements: null,
          fitProfileId: fitProfile?.id ?? null,
          selectedFittingServiceIds: this.extractServiceIds(item.fittingServicesSnapshot),
        },
      };
    }

    // CUSTOM_STITCHING
    return {
      kind: 'PREFILL',
      itemType: 'CUSTOM_STITCHING',
      prefill: {
        garmentType: item.garmentType ?? '',
        condition: null,
        brand: null,
        currentSize: null,
        fabricDetails: item.fabricDetails,
        designDetails: item.designDetails,
        color: null,
        specialRequirements: null,
        fitProfileId: fitProfile?.id ?? null,
        selectedFittingServiceIds: [],
      },
    };
  }

  private extractServiceIds(snapshot: unknown): string[] {
    if (!Array.isArray(snapshot)) return [];
    return snapshot
      .map((s) => (s && typeof s === 'object' && 'id' in s ? String((s as { id: unknown }).id) : null))
      .filter((id): id is string => Boolean(id));
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }
    return profile;
  }
}
