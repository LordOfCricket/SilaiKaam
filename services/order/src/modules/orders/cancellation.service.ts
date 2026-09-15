import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_TITLE, type CancelOrderResultDto, type NotificationType, type OrderStatus } from '@silaikaam/types';
import { Prisma } from '@silaikaam/database';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ORDER_STATUS_MESSAGE } from './status-messages';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** V1 cancellation policy — conservative and deterministic: an order may
 * only be self-cancelled while it hasn't yet entered fitting/QC/delivery
 * (PLACED/CONFIRMED/PREPARING). Anything further along (or already
 * CANCELLED/terminal) requires Support/Dispute instead — see
 * `getEligibility`. Order-level only: this app creates/decrements an Order
 * as one atomic unit, so partial/item cancellation would need a larger
 * redesign than this batch calls for. */
const CANCELLABLE_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING'];

@Injectable()
export class CancellationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getEligibility(status: OrderStatus): { eligible: boolean; reason: string } {
    if (status === 'CANCELLED') {
      return { eligible: false, reason: 'This order has already been cancelled.' };
    }
    if (CANCELLABLE_STATUSES.includes(status)) {
      return {
        eligible: true,
        reason: 'You can cancel this order before it enters fitting or delivery preparation.',
      };
    }
    return {
      eligible: false,
      reason: 'This order can no longer be cancelled online. Please contact support for help.',
    };
  }

  async cancel(userId: string, orderId: string, dto: CancelOrderDto): Promise<CancelOrderResultDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException({ code: 'ORDER_ALREADY_CANCELLED', message: 'This order has already been cancelled.' });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException({
        code: 'ORDER_NOT_CANCELLABLE',
        message: 'This order can no longer be cancelled online. Please contact support for help.',
      });
    }

    let cancellationId: string;
    let refundCreated: boolean;
    try {
      const result = await this.prisma.client.$transaction(async (tx) => {
        // Restore stock exactly as it was decremented at checkout — only
        // for items that actually reserved a ProductVariant.
        for (const item of order.items) {
          if (item.variantId && item.quantity) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, status: 'CANCELLED', note: ORDER_STATUS_MESSAGE.CANCELLED },
        });

        const cancellation = await tx.orderCancellation.create({
          data: { orderId: order.id, customerProfileId: profile.id, reason: dto.reason, note: dto.note || null },
        });

        // A Refund record here means "this SHOULD be refunded" — there is
        // no real payment provider, so it starts and stays PENDING until
        // one exists. Never implies money has moved.
        let created = false;
        if (order.total > 0) {
          await tx.refund.create({
            data: {
              orderId: order.id,
              customerProfileId: profile.id,
              amount: new Prisma.Decimal(order.total.toFixed(2)),
              reason: 'CANCELLATION',
              status: 'PENDING',
              sourceCancellationId: cancellation.id,
            },
          });
          created = true;
        }

        return { cancellationId: cancellation.id, refundCreated: created };
      });
      cancellationId = result.cancellationId;
      refundCreated = result.refundCreated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        // Lost a genuine concurrent race — the other request already
        // cancelled this order; never restore stock or refund twice.
        throw new BadRequestException({ code: 'ORDER_ALREADY_CANCELLED', message: 'This order has already been cancelled.' });
      }
      throw error;
    }

    await this.notifyBestEffort(
      profile.id,
      order.id,
      'CANCELLATION_CONFIRMED',
      ORDER_STATUS_MESSAGE.CANCELLED,
      `CANCELLATION_CONFIRMED:${cancellationId}`,
    );
    if (refundCreated) {
      await this.notifyBestEffort(
        profile.id,
        order.id,
        'REFUND_REQUESTED',
        'Your refund request has been recorded. Payment processing is not yet connected.',
        `REFUND_REQUESTED:${cancellationId}`,
      );
    }

    const cancellation = await this.prisma.client.orderCancellation.findUniqueOrThrow({ where: { id: cancellationId } });
    return {
      cancellation: {
        id: cancellation.id,
        orderId: cancellation.orderId,
        reason: cancellation.reason,
        note: cancellation.note,
        createdAt: cancellation.createdAt.toISOString(),
      },
      refundCreated,
    };
  }

  /** Best-effort — must never break a cancellation that already succeeded.
   * `dedupeKey`'s unique index gives idempotency for free. */
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
      // Duplicate or transient failure — never block the cancellation.
    }
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }
    return profile;
  }
}
