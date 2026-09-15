import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@silaikaam/database';
import {
  FITTING_CUSTOMER_MESSAGE,
  FITTING_CUSTOMER_STATUS,
  NOTIFICATION_TITLE,
  type CartItemType,
  type FittingProgressDto,
  type NotificationType,
  type OrderDetailDto,
  type OrderItemType,
  type OrderStatus,
  type OrderSummaryDto,
  type ReorderInfoDto,
  type ReviewDto,
  type ReviewTargetType,
  type ReviewableTargetDto,
} from '@silaikaam/types';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CancellationService } from './cancellation.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RespondActionRequestDto } from './dto/respond-action-request.dto';
import { ORDER_STATUS_MESSAGE } from './status-messages';

// Item types that get a fitting workflow at all — PRODUCT_ONLY and
// CUSTOM_STITCHING never do (see Phase 16/18: "no fitting workflow" /
// "do not incorrectly label custom stitching as standard fitting").
const FITTING_ELIGIBLE_TYPES: OrderItemType[] = ['PRODUCT_WITH_FITTING', 'EXISTING_GARMENT_FITTING'];

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

// Cart-view issues that are purely informational (Existing Garment/Custom
// Stitching are ALWAYS "pricing pending" — that's not a reason to block
// checkout, it's the honest, expected state for those journeys).
const NON_BLOCKING_ISSUE_CODES = new Set(['PRICING_UNAVAILABLE', 'QUOTE_REQUIRED']);

const CART_TO_ORDER_TYPE: Record<CartItemType, OrderItemType> = {
  PRODUCT_ONLY: 'PRODUCT_ONLY',
  BUY_FIT: 'PRODUCT_WITH_FITTING',
  EXISTING_GARMENT: 'EXISTING_GARMENT_FITTING',
  CUSTOM_STITCHING: 'CUSTOM_STITCHING',
};

const TIMELINE_BY_TYPE: Record<OrderItemType, OrderStatus[]> = {
  PRODUCT_ONLY: [
    'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PREPARING_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  ],
  PRODUCT_WITH_FITTING: [
    'PLACED', 'CONFIRMED', 'PREPARING', 'FITTING', 'QUALITY_CHECK', 'READY', 'PREPARING_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  ],
  EXISTING_GARMENT_FITTING: [
    'PLACED', 'CONFIRMED', 'PREPARING', 'FITTING', 'QUALITY_CHECK', 'READY', 'PREPARING_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  ],
  // No FittingWorkflow exists for custom stitching (there is no production/QC
  // model for it yet) — its timeline must not borrow the fitting QC step.
  CUSTOM_STITCHING: [
    'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PREPARING_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
  ],
};
const STATUS_ORDER: OrderStatus[] = [
  'PLACED', 'CONFIRMED', 'PREPARING', 'FITTING', 'QUALITY_CHECK', 'READY',
  'PREPARING_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED',
];
// Branch/side-states — never part of the forward-only timeline (same
// treatment as CANCELLED), surfaced instead via `statusMessage`.
const SIDE_STATES: OrderStatus[] = ['CANCELLED', 'DELIVERY_FAILED', 'DELIVERY_RESCHEDULED'];

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CartService) private readonly cartService: CartService,
    @Inject(CancellationService) private readonly cancellationService: CancellationService,
  ) {}

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const profile = await this.findCustomerProfileOrThrow(userId);

    const existing = await this.prisma.client.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      if (existing.customerProfileId !== profile.id) {
        throw new ForbiddenException({ code: 'CROSS_CUSTOMER_ACCESS_DENIED', message: 'You are not allowed to access this resource.' });
      }
      return { order: await this.toOrderDetail(existing.id), created: false };
    }

    const address = await this.prisma.client.address.findFirst({
      where: { id: dto.addressId, customerProfileId: profile.id, isActive: true },
    });
    if (!address) {
      throw new BadRequestException({ code: 'ADDRESS_INVALID', message: 'Select a valid delivery address.' });
    }

    const { cart, rows, items } = await this.cartService.getCartForCheckout(userId);
    if (items.length === 0) {
      throw new BadRequestException({ code: 'CART_EMPTY', message: 'Your cart is empty.' });
    }

    const blockingIssues = items.flatMap((item) => item.issues.filter((i) => !NON_BLOCKING_ISSUE_CODES.has(i.code)));
    if (blockingIssues.length > 0) {
      throw new BadRequestException({
        code: 'CART_NEEDS_UPDATE',
        message: 'Your cart needs to be updated before checkout.',
        details: blockingIssues,
      });
    }

    try {
      const orderId = await this.prisma.client.$transaction(async (tx) => {
        // Re-decrement stock atomically at commit time — the authoritative
        // concurrency-safe gate, independent of the pre-transaction read.
        for (const row of rows) {
          if ((row.type === 'PRODUCT_ONLY' || row.type === 'BUY_FIT') && row.variantId && row.quantity) {
            const result = await tx.productVariant.updateMany({
              where: { id: row.variantId, isActive: true, stock: { gte: row.quantity } },
              data: { stock: { decrement: row.quantity } },
            });
            if (result.count !== 1) {
              throw new BadRequestException({
                code: 'STOCK_CHANGED',
                message: 'Stock changed for an item in your cart. Please review your cart and try again.',
              });
            }
          }
        }

        const itemsData = await Promise.all(rows.map((row) => this.buildOrderItemData(tx, row)));
        const productSubtotal = itemsData.reduce(
          (sum, d) => sum + (d.type === 'PRODUCT_ONLY' || d.type === 'PRODUCT_WITH_FITTING' ? (d.lineTotal ?? 0) : 0),
          0,
        );
        const fittingSubtotal = itemsData.reduce((sum, d) => sum + (d.fittingKnownTotal ?? 0), 0);
        const hasUnpricedItems = items.some((item) =>
          item.issues.some((i) => NON_BLOCKING_ISSUE_CODES.has(i.code)) || item.selectedFittingServices.some((s) => s.basePrice === null),
        );

        const order = await tx.order.create({
          data: {
            customerProfileId: profile.id,
            idempotencyKey: dto.idempotencyKey,
            status: 'PLACED',
            paymentState: 'PENDING',
            productSubtotal,
            fittingSubtotal,
            discountTotal: 0,
            total: productSubtotal + fittingSubtotal,
            hasUnpricedItems,
            items: {
              create: itemsData.map(({ fittingKnownTotal: _f, ...d }) => d),
            },
            addressSnapshot: {
              create: {
                label: address.label,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
              },
            },
            statusHistory: { create: { status: 'PLACED', note: ORDER_STATUS_MESSAGE.PLACED } },
          },
          include: { items: true },
        });

        for (const item of order.items) {
          if (!FITTING_ELIGIBLE_TYPES.includes(item.type)) continue;
          const workflow = await tx.fittingWorkflow.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              customerProfileId: profile.id,
              itemType: item.type,
            },
          });
          await tx.fittingStatusHistory.create({
            data: {
              fittingWorkflowId: workflow.id,
              status: 'RECEIVED',
              customerMessage: FITTING_CUSTOMER_MESSAGE.RECEIVED,
              actorSource: 'SYSTEM',
            },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return order.id;
      });

      await this.notifyBestEffort({
        customerProfileId: profile.id,
        type: 'ORDER_PLACED',
        message: ORDER_STATUS_MESSAGE.PLACED,
        relatedOrderId: orderId,
        dedupeKey: `ORDER_PLACED:${orderId}`,
      });

      return { order: await this.toOrderDetail(orderId), created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        // Lost a genuine concurrent race on the idempotency key — the other
        // request's order is authoritative; return it instead of erroring.
        const winner = await this.prisma.client.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (winner) return { order: await this.toOrderDetail(winner.id), created: false };
      }
      throw error;
    }
  }

  async listOrders(userId: string): Promise<OrderSummaryDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const orders = await this.prisma.client.order.findMany({
      where: { customerProfileId: profile.id },
      include: { items: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      paymentState: o.paymentState,
      total: o.total,
      hasUnpricedItems: o.hasUnpricedItems,
      itemCount: o.items.length,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  async getOrder(userId: string, orderId: string): Promise<OrderDetailDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }
    return this.toOrderDetail(orderId);
  }

  // ---------------------------------------------------------------------

  private async buildOrderItemData(
    tx: Prisma.TransactionClient,
    row: Prisma.CartItemGetPayload<Record<string, never>>,
  ) {
    const type = CART_TO_ORDER_TYPE[row.type];

    if (row.type === 'PRODUCT_ONLY' || row.type === 'BUY_FIT') {
      const product = await tx.product.findUnique({ where: { id: row.productId! } });
      const variant = row.variantId ? await tx.productVariant.findUnique({ where: { id: row.variantId } }) : null;
      const unitPrice = variant?.price ?? product?.discountPrice ?? product?.price ?? 0;
      const discountAmount = product && product.discountPrice !== null ? Math.max(product.price - product.discountPrice, 0) : 0;
      const lineTotal = row.quantity ? unitPrice * row.quantity : null;

      let fittingKnownTotal = 0;
      let measurementsSnapshot: Prisma.InputJsonValue = [];
      let fittingServicesSnapshot: Prisma.InputJsonValue = [];
      let fitProfileLabel: string | null = null;
      let fitPreference: string | null = null;

      if (row.type === 'BUY_FIT' && row.fitProfileId) {
        const fitProfile = await tx.fitProfile.findUnique({ where: { id: row.fitProfileId } });
        const measurements = await tx.fitMeasurement.findMany({ where: { fitProfileId: row.fitProfileId } });
        const services = await tx.fittingService.findMany({ where: { id: { in: row.selectedFittingServiceIds } } });
        fitProfileLabel = fitProfile?.label ?? null;
        fitPreference = fitProfile?.fitPreference ?? null;
        measurementsSnapshot = measurements.map((m) => ({ key: m.key, value: m.value, unit: m.unit }));
        fittingServicesSnapshot = services.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice }));
        fittingKnownTotal = services.reduce((sum, s) => sum + (s.basePrice ?? 0), 0);
      }

      return {
        type,
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        variantId: variant?.id ?? null,
        variantSize: variant?.size ?? null,
        variantColor: variant?.color ?? null,
        quantity: row.quantity,
        unitPrice,
        discountAmount,
        fitProfileId: row.fitProfileId,
        fitProfileLabel,
        fitPreference,
        measurementsSnapshot,
        fittingServicesSnapshot,
        notes: row.notes,
        lineTotal,
        fittingKnownTotal,
      };
    }

    if (row.type === 'EXISTING_GARMENT') {
      const request = await tx.existingGarmentRequest.findUnique({
        where: { id: row.existingGarmentRequestId! },
        include: { photos: true },
      });
      const services = await tx.fittingService.findMany({ where: { id: { in: request?.selectedFittingServiceIds ?? [] } } });
      return {
        type,
        existingGarmentRequestId: request?.id ?? null,
        garmentType: request?.garmentType ?? null,
        garmentCondition: request?.condition ?? null,
        garmentBrand: request?.brand ?? null,
        garmentPhotoCount: request?.photos.length ?? 0,
        fitProfileId: request?.fitProfileId ?? null,
        fittingServicesSnapshot: services.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice })),
        notes: request?.notes ?? null,
        lineTotal: null,
        fittingKnownTotal: 0,
      };
    }

    // CUSTOM_STITCHING
    const request = await tx.customStitchingRequest.findUnique({ where: { id: row.customStitchingRequestId! } });
    return {
      type,
      customStitchingRequestId: request?.id ?? null,
      fabricDetails: request?.fabricDetails ?? null,
      designDetails: request?.designDetails ?? null,
      garmentType: request?.garmentType ?? null,
      fitProfileId: request?.fitProfileId ?? null,
      notes: request?.notes ?? null,
      lineTotal: null,
      fittingKnownTotal: 0,
    };
  }

  private async toOrderDetail(orderId: string): Promise<OrderDetailDto> {
    const order = await this.prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        addressSnapshot: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    const relevantTypes = new Set(order.items.map((i) => i.type));
    const timelineSteps = STATUS_ORDER.filter(
      (status) => !SIDE_STATES.includes(status) && [...relevantTypes].some((t) => TIMELINE_BY_TYPE[t].includes(status)),
    );

    const workflows = await this.prisma.client.fittingWorkflow.findMany({
      where: { orderId: order.id },
      include: { actionRequests: { where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const workflowByItemId = new Map(workflows.map((w) => [w.orderItemId, w]));

    const isCompleted = order.status === 'COMPLETED';
    const existingReviews = isCompleted
      ? await this.prisma.client.review.findMany({ where: { orderId: order.id } })
      : [];
    const reorderInfoByItemId = new Map(
      isCompleted
        ? await Promise.all(
            order.items.map(async (item) => [item.id, await this.computeReorderInfo(item)] as const),
          )
        : [],
    );

    const lastForward = [...order.statusHistory].reverse().find((h) => timelineSteps.includes(h.status));
    const currentStepIndex = lastForward
      ? timelineSteps.indexOf(lastForward.status)
      : Math.max(timelineSteps.indexOf(order.status), 0);
    const lastHistoryNote = order.statusHistory[order.statusHistory.length - 1]?.note;
    const statusMessage = lastHistoryNote ?? ORDER_STATUS_MESSAGE[order.status];

    const [cancellationRow, refundRows, disputeRows] = await Promise.all([
      this.prisma.client.orderCancellation.findUnique({ where: { orderId: order.id } }),
      this.prisma.client.refund.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'asc' } }),
      this.prisma.client.dispute.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      id: order.id,
      status: order.status,
      paymentState: order.paymentState,
      productSubtotal: order.productSubtotal,
      fittingSubtotal: order.fittingSubtotal,
      discountTotal: order.discountTotal,
      total: order.total,
      hasUnpricedItems: order.hasUnpricedItems,
      items: order.items.map((item) => ({
        id: item.id,
        type: item.type,
        product: item.productId || item.productName ? { id: item.productId, name: item.productName } : null,
        variant: item.variantSize || item.variantColor ? { size: item.variantSize, color: item.variantColor } : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        fitProfile: item.fitProfileLabel ? { label: item.fitProfileLabel, fitPreference: (item.fitPreference ?? 'REGULAR') as never } : null,
        measurements: (item.measurementsSnapshot as never[]) ?? [],
        fittingServices: (item.fittingServicesSnapshot as never[]) ?? [],
        notes: item.notes,
        existingGarment:
          item.type === 'EXISTING_GARMENT_FITTING'
            ? {
                garmentType: item.garmentType ?? '',
                condition: (item.garmentCondition ?? 'GOOD') as never,
                brand: item.garmentBrand,
                photoCount: item.garmentPhotoCount ?? 0,
              }
            : null,
        customStitching:
          item.type === 'CUSTOM_STITCHING'
            ? { garmentType: item.garmentType ?? '', fabricDetails: item.fabricDetails, designDetails: item.designDetails }
            : null,
        lineTotal: item.lineTotal,
        fitting: this.toFittingProgress(workflowByItemId.get(item.id)),
        reviewableTargets: isCompleted ? this.buildReviewableTargets(item, existingReviews) : [],
        reorder: reorderInfoByItemId.get(item.id) ?? null,
      })),
      address: {
        label: order.addressSnapshot?.label ?? null,
        line1: order.addressSnapshot?.line1 ?? '',
        line2: order.addressSnapshot?.line2 ?? null,
        city: order.addressSnapshot?.city ?? '',
        state: order.addressSnapshot?.state ?? '',
        postalCode: order.addressSnapshot?.postalCode ?? '',
        country: order.addressSnapshot?.country ?? '',
      },
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
      timelineSteps,
      currentStepIndex,
      statusMessage,
      createdAt: order.createdAt.toISOString(),
      cancellationEligibility: this.cancellationService.getEligibility(order.status),
      cancellation: cancellationRow
        ? {
            id: cancellationRow.id,
            orderId: cancellationRow.orderId,
            reason: cancellationRow.reason,
            note: cancellationRow.note,
            createdAt: cancellationRow.createdAt.toISOString(),
          }
        : null,
      refunds: refundRows.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderItemId: r.orderItemId,
        amount: Number(r.amount.toString()),
        currency: r.currency,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      })),
      disputes: disputeRows.map((d) => ({
        id: d.id,
        orderId: d.orderId,
        orderItemId: d.orderItemId,
        type: d.type,
        description: d.description,
        status: d.status,
        resolution: d.resolution,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
      })),
    };
  }

  /** Customer submits the info/response an inspection asked for. Ownership
   * is checked end-to-end: order -> customer, action request -> this
   * order's fitting workflow. Re-submitting an already-answered request is
   * rejected rather than silently overwritten (auditability). */
  async respondToActionRequest(userId: string, orderId: string, actionRequestId: string, dto: RespondActionRequestDto) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }

    const actionRequest = await this.prisma.client.fittingActionRequest.findUnique({
      where: { id: actionRequestId },
      include: { fittingWorkflow: true },
    });
    if (!actionRequest || actionRequest.fittingWorkflow.orderId !== orderId) {
      throw new NotFoundException({ code: 'ACTION_REQUEST_NOT_FOUND', message: 'This request was not found.' });
    }
    if (actionRequest.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'ACTION_REQUEST_ALREADY_HANDLED',
        message: 'This request has already been responded to.',
      });
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.fittingActionRequest.update({
        where: { id: actionRequestId },
        data: { status: 'SUBMITTED', customerResponseText: dto.responseText, respondedAt: new Date() },
      });
      await tx.fittingWorkflow.update({
        where: { id: actionRequest.fittingWorkflowId },
        data: { status: 'INSPECTION' },
      });
      await tx.fittingStatusHistory.create({
        data: {
          fittingWorkflowId: actionRequest.fittingWorkflowId,
          status: 'INSPECTION',
          customerMessage: FITTING_CUSTOMER_MESSAGE.INSPECTION,
          actorSource: 'SYSTEM',
        },
      });
    });

    return { status: 'SUBMITTED' as const, message: "Thanks — we've received your response and will continue shortly." };
  }

  private buildReviewableTargets(
    item: { id: string; type: OrderItemType },
    existingReviews: {
      id: string;
      orderId: string;
      orderItemId: string;
      targetType: ReviewTargetType;
      rating: number;
      title: string | null;
      comment: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[],
  ): ReviewableTargetDto[] {
    const targets: ReviewTargetType[] = [];
    if (item.type === 'PRODUCT_ONLY' || item.type === 'PRODUCT_WITH_FITTING') targets.push('PRODUCT');
    if (item.type === 'PRODUCT_WITH_FITTING' || item.type === 'EXISTING_GARMENT_FITTING') targets.push('FITTING');
    if (item.type === 'CUSTOM_STITCHING') targets.push('CUSTOM_STITCHING');

    return targets.map((targetType) => ({
      targetType,
      existingReview: this.toReviewDto(
        existingReviews.find((r) => r.orderItemId === item.id && r.targetType === targetType),
      ),
    }));
  }

  private toReviewDto(review: {
    id: string;
    orderId: string;
    orderItemId: string;
    targetType: ReviewTargetType;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | undefined): ReviewDto | null {
    if (!review) return null;
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

  /** Live-checked "Buy Again" eligibility for a completed order's item —
   * never trusts the historical snapshot for price/availability. */
  private async computeReorderInfo(item: {
    id: string;
    type: OrderItemType;
    productId: string | null;
    variantId: string | null;
  }): Promise<ReorderInfoDto | null> {
    if (item.type !== 'PRODUCT_ONLY' && item.type !== 'PRODUCT_WITH_FITTING') return null;
    if (!item.productId) return { eligible: false, reason: 'This item is no longer available.', currentPrice: null };

    const product = await this.prisma.client.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.isActive) {
      return { eligible: false, reason: 'This item is no longer available.', currentPrice: null };
    }

    let currentPrice = product.discountPrice ?? product.price;
    if (item.variantId) {
      const variant = await this.prisma.client.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || !variant.isActive) {
        return { eligible: false, reason: 'This item is no longer available.', currentPrice: null };
      }
      if (variant.stock <= 0) {
        return { eligible: false, reason: 'This item is currently out of stock.', currentPrice: null };
      }
      currentPrice = variant.price ?? currentPrice;
    }

    return { eligible: true, reason: null, currentPrice };
  }

  private toFittingProgress(
    workflow:
      | { status: keyof typeof FITTING_CUSTOMER_STATUS; actionRequests: { id: string; requestedInfo: string }[] }
      | undefined,
  ): FittingProgressDto | null {
    if (!workflow) return null;
    const actionRequired = workflow.actionRequests[0]
      ? { id: workflow.actionRequests[0].id, requestedInfo: workflow.actionRequests[0].requestedInfo }
      : null;
    return {
      status: FITTING_CUSTOMER_STATUS[workflow.status],
      message: FITTING_CUSTOMER_MESSAGE[workflow.status],
      actionRequired,
    };
  }

  /** Best-effort — must never break an order operation that already
   * succeeded. `dedupeKey`'s unique index gives idempotency for free. */
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
      // Duplicate or transient failure — never block a successful order op.
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
