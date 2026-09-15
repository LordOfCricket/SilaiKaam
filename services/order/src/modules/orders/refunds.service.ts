import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_TITLE, type NotificationType, type RefundDto, type RefundStatus } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';

const REFUND_TRANSITIONS: Partial<Record<RefundStatus, RefundStatus[]>> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SUCCEEDED', 'FAILED'],
};

const REFUND_NOTIFICATION_TYPE: Partial<Record<RefundStatus, NotificationType>> = {
  PROCESSING: 'REFUND_PROCESSING',
  SUCCEEDED: 'REFUND_COMPLETED',
  FAILED: 'REFUND_FAILED',
};

/** Customer-facing reads only — refunds are a consequence of cancellation
 * /dispute resolution, never something a customer directly creates or
 * advances (see `process`, which is internal-ops only). */
@Injectable()
export class RefundsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, orderId: string): Promise<RefundDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    const refunds = await this.prisma.client.refund.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
    return refunds.map((r) => this.toDto(r));
  }

  /** Internal ops only (not gateway-exposed — no payment provider or staff
   * UI exists yet). Lets the refund lifecycle actually be exercised/tested
   * without ever letting a customer mark their own refund succeeded. */
  async process(refundId: string, targetStatus: RefundStatus) {
    const refund = await this.prisma.client.refund.findUnique({ where: { id: refundId } });
    if (!refund) {
      throw new NotFoundException({ code: 'REFUND_NOT_FOUND', message: 'Refund not found.' });
    }
    if (refund.status === targetStatus) return this.toDto(refund); // idempotent no-op

    const allowed = REFUND_TRANSITIONS[refund.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move from ${refund.status} to ${targetStatus}.`,
      });
    }

    const updated = await this.prisma.client.refund.update({
      where: { id: refundId },
      data: {
        status: targetStatus,
        processedAt: targetStatus === 'SUCCEEDED' || targetStatus === 'FAILED' ? new Date() : refund.processedAt,
      },
    });

    const notificationType = REFUND_NOTIFICATION_TYPE[targetStatus];
    if (notificationType) {
      try {
        await this.prisma.client.notification.create({
          data: {
            customerProfileId: refund.customerProfileId,
            type: notificationType,
            title: NOTIFICATION_TITLE[notificationType],
            message: this.customerMessage(targetStatus),
            relatedOrderId: refund.orderId,
            dedupeKey: `${notificationType}:${refund.id}:${targetStatus}`,
          },
        });
      } catch {
        // Best-effort — never block the refund status update.
      }
    }

    return this.toDto(updated);
  }

  private customerMessage(status: RefundStatus): string {
    switch (status) {
      case 'PENDING':
        return 'Your refund request has been recorded. Payment processing is not yet connected.';
      case 'PROCESSING':
        return 'Your refund is being processed.';
      case 'SUCCEEDED':
        return 'Your refund has been completed.';
      case 'FAILED':
        return 'Your refund could not be completed. Please contact support.';
      case 'CANCELLED':
        return 'Your refund request was cancelled.';
    }
  }

  private toDto(refund: {
    id: string;
    orderId: string;
    orderItemId: string | null;
    amount: { toString(): string };
    currency: string;
    reason: string;
    status: RefundStatus;
    createdAt: Date;
    updatedAt: Date;
    processedAt: Date | null;
  }): RefundDto {
    return {
      id: refund.id,
      orderId: refund.orderId,
      orderItemId: refund.orderItemId,
      amount: Number(refund.amount.toString()),
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
      processedAt: refund.processedAt ? refund.processedAt.toISOString() : null,
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
