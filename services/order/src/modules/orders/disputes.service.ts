import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_TITLE, type DisputeDto, type NotificationType } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

const UNRESOLVED_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED'];

/** Disputes are structured business data — conversation about one happens
 * through the existing Support system (Batch 9), not a duplicated
 * messaging model here. Customers can never resolve their own dispute or
 * reopen the underlying fitting workflow directly; both require
 * authorized internal operations that don't exist yet in this batch. */
@Injectable()
export class DisputesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, orderId: string): Promise<DisputeDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    await this.findOwnedOrderOrThrow(profile.id, orderId);
    const disputes = await this.prisma.client.dispute.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
    return disputes.map((d) => this.toDto(d));
  }

  async get(userId: string, orderId: string, disputeId: string): Promise<DisputeDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    await this.findOwnedOrderOrThrow(profile.id, orderId);
    const dispute = await this.prisma.client.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute || dispute.orderId !== orderId) {
      throw new NotFoundException({ code: 'DISPUTE_NOT_FOUND', message: 'Dispute not found.' });
    }
    return this.toDto(dispute);
  }

  async create(userId: string, orderId: string, dto: CreateDisputeDto): Promise<DisputeDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.findOwnedOrderOrThrow(profile.id, orderId);

    if (order.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'ORDER_CANCELLED',
        message: 'This order was cancelled — start a new order or contact support instead.',
      });
    }

    if (dto.orderItemId) {
      const item = await this.prisma.client.orderItem.findUnique({ where: { id: dto.orderItemId } });
      if (!item || item.orderId !== orderId) {
        throw new BadRequestException({ code: 'ORDER_ITEM_INVALID', message: 'Select a valid item from this order.' });
      }
    }

    const duplicate = await this.prisma.client.dispute.findFirst({
      where: { orderId, type: dto.type, status: { in: UNRESOLVED_STATUSES as never[] } },
    });
    if (duplicate) {
      throw new BadRequestException({
        code: 'DUPLICATE_DISPUTE',
        message: 'You already have an open report for this issue on this order.',
      });
    }

    const dispute = await this.prisma.client.dispute.create({
      data: {
        customerProfileId: profile.id,
        orderId,
        orderItemId: dto.orderItemId ?? null,
        type: dto.type,
        description: dto.description,
      },
    });

    await this.notifyBestEffort(
      profile.id,
      orderId,
      'DISPUTE_OPENED',
      'We have received your report and will review it.',
      `DISPUTE_OPENED:${dispute.id}`,
    );
    if (dto.type === 'FIT_ISSUE') {
      await this.notifyBestEffort(
        profile.id,
        orderId,
        'REWORK_REQUESTED',
        "We've logged your fit concern for review.",
        `REWORK_REQUESTED:${dispute.id}`,
      );
    }

    return this.toDto(dispute);
  }

  private async notifyBestEffort(
    customerProfileId: string,
    orderId: string,
    type: NotificationType,
    message: string,
    dedupeKey: string,
  ) {
    try {
      await this.prisma.client.notification.create({
        data: {
          customerProfileId,
          type,
          title: NOTIFICATION_TITLE[type],
          message,
          relatedOrderId: orderId,
          dedupeKey,
        },
      });
    } catch {
      // Duplicate or transient failure — never block dispute creation.
    }
  }

  private toDto(dispute: {
    id: string;
    orderId: string;
    orderItemId: string | null;
    type: DisputeDto['type'];
    description: string;
    status: DisputeDto['status'];
    resolution: string | null;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
  }): DisputeDto {
    return {
      id: dispute.id,
      orderId: dispute.orderId,
      orderItemId: dispute.orderItemId,
      type: dispute.type,
      description: dispute.description,
      status: dispute.status,
      resolution: dispute.resolution,
      createdAt: dispute.createdAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
      resolvedAt: dispute.resolvedAt ? dispute.resolvedAt.toISOString() : null,
    };
  }

  private async findOwnedOrderOrThrow(customerProfileId: string, orderId: string) {
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
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
