import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import type { ReviewDto, ReviewTargetType } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Reviews are only ever created against the order/item the authenticated
 * customer actually owns and actually received — eligibility is derived
 * from Order/OrderItem/FittingWorkflow, never taken from client input. */
@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, orderId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.findOwnedOrderOrThrow(profile.id, orderId);

    if (order.status !== 'COMPLETED') {
      throw new BadRequestException({
        code: 'ORDER_NOT_COMPLETED',
        message: 'You can review this order once it has been completed.',
      });
    }

    const item = order.items.find((i) => i.id === dto.orderItemId);
    if (!item) {
      throw new NotFoundException({ code: 'ORDER_ITEM_NOT_FOUND', message: 'Order item not found.' });
    }

    await this.assertEligible(item, dto.targetType);

    try {
      const review = await this.prisma.client.review.create({
        data: {
          customerProfileId: profile.id,
          orderId: order.id,
          orderItemId: item.id,
          targetType: dto.targetType,
          rating: dto.rating,
          title: dto.title || null,
          comment: dto.comment || null,
        },
      });
      return this.toDto(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'You have already submitted this review.',
        });
      }
      throw error;
    }
  }

  async list(userId: string, orderId: string): Promise<ReviewDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    await this.findOwnedOrderOrThrow(profile.id, orderId);
    const reviews = await this.prisma.client.review.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    return reviews.map((r) => this.toDto(r));
  }

  async update(userId: string, orderId: string, reviewId: string, dto: UpdateReviewDto): Promise<ReviewDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const review = await this.prisma.client.review.findUnique({ where: { id: reviewId } });
    if (!review || review.orderId !== orderId || review.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Review not found.' });
    }

    const updated = await this.prisma.client.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating ?? undefined,
        title: dto.title !== undefined ? dto.title || null : undefined,
        comment: dto.comment !== undefined ? dto.comment || null : undefined,
      },
    });
    return this.toDto(updated);
  }

  private async assertEligible(
    item: { id: string; type: string; garmentType: string | null },
    targetType: ReviewTargetType,
  ) {
    if (targetType === 'PRODUCT') {
      if (item.type !== 'PRODUCT_ONLY' && item.type !== 'PRODUCT_WITH_FITTING') {
        throw new BadRequestException({
          code: 'INVALID_REVIEW_TARGET',
          message: 'This item cannot be reviewed as a product.',
        });
      }
      return;
    }

    if (targetType === 'CUSTOM_STITCHING') {
      if (item.type !== 'CUSTOM_STITCHING') {
        throw new BadRequestException({
          code: 'INVALID_REVIEW_TARGET',
          message: 'This item cannot be reviewed as custom stitching.',
        });
      }
      return;
    }

    // FITTING
    if (item.type !== 'PRODUCT_WITH_FITTING' && item.type !== 'EXISTING_GARMENT_FITTING') {
      throw new BadRequestException({
        code: 'INVALID_REVIEW_TARGET',
        message: 'This item does not have a fitting service to review.',
      });
    }
    const workflow = await this.prisma.client.fittingWorkflow.findUnique({ where: { orderItemId: item.id } });
    if (!workflow || (workflow.status !== 'READY' && workflow.status !== 'COMPLETED')) {
      throw new BadRequestException({
        code: 'FITTING_NOT_COMPLETED',
        message: 'You can review your fitting once it has been completed.',
      });
    }
  }

  private toDto(review: {
    id: string;
    orderId: string;
    orderItemId: string;
    targetType: ReviewTargetType;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ReviewDto {
    return {
      id: review.id,
      orderId: review.orderId,
      orderItemId: review.orderItemId,
      targetType: review.targetType,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  private async findOwnedOrderOrThrow(customerProfileId: string, orderId: string) {
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.customerProfileId !== customerProfileId) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    return order;
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }
    return profile;
  }
}
