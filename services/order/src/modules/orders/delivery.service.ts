import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_TITLE, type NotificationType, type OrderStatus } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ORDER_STATUS_MESSAGE } from './status-messages';

// Only the customer-meaningful delivery statuses generate a notification —
// PREPARING_FOR_DELIVERY has no dedicated type (it's the least eventful
// step) so it falls back to the generic ORDER_STATUS_CHANGED type.
const DELIVERY_NOTIFICATION_TYPE: Partial<Record<OrderStatus, NotificationType>> = {
  PREPARING_FOR_DELIVERY: 'ORDER_STATUS_CHANGED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'ORDER_DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  DELIVERY_RESCHEDULED: 'DELIVERY_RESCHEDULED',
  COMPLETED: 'ORDER_COMPLETED',
};


// Statuses an order may be in when delivery prep begins — anything already
// past this point (or CANCELLED) cannot restart delivery prep.
const PRE_DELIVERY_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'];

const DELIVERY_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PREPARING_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'],
  DELIVERY_FAILED: ['DELIVERY_RESCHEDULED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERY_RESCHEDULED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
};

/**
 * Internal-only operational surface (not reachable via the API Gateway —
 * no staff/logistics UI exists yet). Lives inside order-service since Order
 * is what it operates on — kept as its own class so delivery concerns stay
 * separable if a dedicated service is ever justified later.
 */
@Injectable()
export class DeliveryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Delivery may begin once every fitting-eligible item on the order has
   * reached READY/COMPLETED — this app has no partial-shipment support, so
   * a single unready item blocks the whole order (deterministic, matches
   * the "least-advanced item wins" rule already used for fitting sync). */
  async beginPreparingForDelivery(orderId: string, actorSource: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === 'PREPARING_FOR_DELIVERY') return order;
    if (!PRE_DELIVERY_STATUSES.includes(order.status)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot begin delivery preparation from status ${order.status}.`,
      });
    }

    const notReadyCount = await this.prisma.client.fittingWorkflow.count({
      where: { orderId, status: { notIn: ['READY', 'COMPLETED'] } },
    });
    if (notReadyCount > 0) {
      throw new BadRequestException({
        code: 'FITTING_NOT_READY',
        message: 'This order is not ready for delivery yet.',
      });
    }

    return this.transition(orderId, 'PREPARING_FOR_DELIVERY', actorSource);
  }

  async advance(orderId: string, target: OrderStatus, actorSource: string) {
    const order = await this.findOrderOrThrow(orderId);
    if (order.status === target) return order; // duplicate transition — idempotent no-op
    const allowed = DELIVERY_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move from ${order.status} to ${target}.`,
      });
    }
    return this.transition(orderId, target, actorSource);
  }

  private async transition(orderId: string, status: OrderStatus, actorSource: string) {
    const [order, historyRow] = await this.prisma.client.$transaction([
      this.prisma.client.order.update({ where: { id: orderId }, data: { status } }),
      this.prisma.client.orderStatusHistory.create({
        data: { orderId, status, note: ORDER_STATUS_MESSAGE[status], actorSource },
      }),
    ]);

    const notificationType = DELIVERY_NOTIFICATION_TYPE[status];
    if (notificationType) {
      await this.notifyBestEffort({
        customerProfileId: order.customerProfileId,
        type: notificationType,
        message: ORDER_STATUS_MESSAGE[status],
        relatedOrderId: orderId,
        dedupeKey: `${notificationType}:${historyRow.id}`,
      });
      if (status === 'COMPLETED') {
        await this.notifyBestEffort({
          customerProfileId: order.customerProfileId,
          type: 'REVIEW_AVAILABLE',
          message: 'Your order is complete — let us know how it went.',
          relatedOrderId: orderId,
          dedupeKey: `REVIEW_AVAILABLE:${historyRow.id}`,
        });
      }
    }

    return order;
  }

  /** Notification creation is best-effort — it must never break a real
   * order/delivery transition that has already succeeded. `dedupeKey`'s
   * unique index gives idempotency against retries for free. */
  private async notifyBestEffort(input: {
    customerProfileId: string;
    type: NotificationType;
    message: string;
    relatedOrderId?: string;
    dedupeKey: string;
  }) {
    try {
      await this.prisma.client.notification.create({
        data: {
          customerProfileId: input.customerProfileId,
          type: input.type,
          title: NOTIFICATION_TITLE[input.type],
          message: input.message,
          relatedOrderId: input.relatedOrderId ?? null,
          dedupeKey: input.dedupeKey,
        },
      });
    } catch {
      // Duplicate (already created) or a transient failure — never block
      // the order/delivery operation that already succeeded.
    }
  }

  private async findOrderOrThrow(orderId: string) {
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    return order;
  }
}
