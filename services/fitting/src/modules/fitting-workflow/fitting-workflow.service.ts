import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_TITLE, type NotificationType } from '@silaikaam/types';
import { MAX_PHOTO_BYTES } from '@silaikaam/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordInspectionDto } from './dto/record-inspection.dto';
import { AdvanceWorkflowDto } from './dto/advance-workflow.dto';
import { RecordQualityCheckDto } from './dto/record-quality-check.dto';
import { UploadReadyPhotoDto } from './dto/upload-ready-photo.dto';
import {
  ADVANCE_TRANSITIONS,
  CUSTOMER_MESSAGE,
  CUSTOMER_STATUS,
  INSPECTABLE_STATUSES,
  ORDER_STATUS_RANK,
  QC_PASS_MESSAGE,
} from './status-map';

/**
 * Internal-only operational surface (not reachable via the API Gateway —
 * there is no staff UI yet). Mirrors the trust model of catalog-service's
 * `/internal/catalog/*` endpoints: relies on network isolation, not a
 * per-request guard, since only trusted backend tooling calls these.
 */
@Injectable()
export class FittingWorkflowService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getInternal(workflowId: string) {
    const workflow = await this.findOrThrow(workflowId);
    return this.prisma.client.fittingWorkflow.findUnique({
      where: { id: workflow.id },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
        inspections: { orderBy: { createdAt: 'asc' } },
        actionRequests: { orderBy: { createdAt: 'asc' } },
        readyPhotos: { select: { id: true, role: true, mimeType: true, sizeBytes: true, createdAt: true } },
      },
    });
  }

  async recordInspection(workflowId: string, dto: RecordInspectionDto) {
    const workflow = await this.findOrThrow(workflowId);
    if (!INSPECTABLE_STATUSES.includes(workflow.status)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot record an inspection from status ${workflow.status}.`,
      });
    }

    const targetStatus =
      dto.outcome === 'PASS' ? 'ASSIGNED' : dto.outcome === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'REJECTED';

    if (dto.outcome === 'ACTION_REQUIRED' && !dto.requestedInfo) {
      throw new BadRequestException({
        code: 'REQUESTED_INFO_REQUIRED',
        message: 'requestedInfo is required when outcome is ACTION_REQUIRED.',
      });
    }

    const historyRow = await this.prisma.client.$transaction(async (tx) => {
      await tx.fittingInspection.create({
        data: {
          fittingWorkflowId: workflow.id,
          outcome: dto.outcome,
          garmentCondition: dto.garmentCondition,
          observations: dto.observations ?? null,
          issues: dto.issues ?? null,
          requiresCustomerAction: dto.requiresCustomerAction ?? dto.outcome === 'ACTION_REQUIRED',
          actorSource: dto.actorSource,
        },
      });

      if (dto.outcome === 'ACTION_REQUIRED') {
        await tx.fittingActionRequest.create({
          data: { fittingWorkflowId: workflow.id, requestedInfo: dto.requestedInfo! },
        });
      }

      await tx.fittingWorkflow.update({ where: { id: workflow.id }, data: { status: targetStatus } });
      return tx.fittingStatusHistory.create({
        data: {
          fittingWorkflowId: workflow.id,
          status: targetStatus,
          customerMessage: CUSTOMER_MESSAGE[targetStatus],
          actorSource: dto.actorSource,
        },
      });
    });

    if (dto.outcome === 'ACTION_REQUIRED') {
      await this.notifyBestEffort(workflow, 'FITTING_ACTION_REQUIRED', CUSTOMER_MESSAGE.ACTION_REQUIRED, historyRow.id);
    } else if (dto.outcome === 'PASS') {
      await this.notifyBestEffort(workflow, 'FITTING_PROGRESS', CUSTOMER_MESSAGE.ASSIGNED, historyRow.id);
    }

    await this.syncOrderStatus(workflow.orderId);
    return this.getInternal(workflow.id);
  }

  /** QC only runs from the QC status. PASS leaves the workflow at QC
   * (it's the gate `markReady` checks) but is still recorded as its own
   * auditable event; REWORK_REQUIRED moves the workflow back for another
   * fitting pass. */
  async recordQualityCheck(workflowId: string, dto: RecordQualityCheckDto) {
    const workflow = await this.findOrThrow(workflowId);
    if (workflow.status !== 'QC') {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot record a quality check from status ${workflow.status}.`,
      });
    }

    const historyRow = await this.prisma.client.$transaction(async (tx) => {
      await tx.fittingInspection.create({
        data: {
          fittingWorkflowId: workflow.id,
          stage: 'QC',
          outcome: dto.outcome,
          observations: dto.observations ?? null,
          issues: dto.issues ?? null,
          requiresCustomerAction: false,
          actorSource: dto.actorSource,
        },
      });

      if (dto.outcome === 'REWORK_REQUIRED') {
        await tx.fittingWorkflow.update({ where: { id: workflow.id }, data: { status: 'REWORK_REQUIRED' } });
        return tx.fittingStatusHistory.create({
          data: {
            fittingWorkflowId: workflow.id,
            status: 'REWORK_REQUIRED',
            customerMessage: CUSTOMER_MESSAGE.REWORK_REQUIRED,
            actorSource: dto.actorSource,
          },
        });
      }
      return tx.fittingStatusHistory.create({
        data: {
          fittingWorkflowId: workflow.id,
          status: 'QC',
          customerMessage: QC_PASS_MESSAGE,
          actorSource: dto.actorSource,
        },
      });
    });

    if (dto.outcome === 'REWORK_REQUIRED') {
      await this.notifyBestEffort(workflow, 'REWORK_REQUIRED', CUSTOMER_MESSAGE.REWORK_REQUIRED, historyRow.id);
    } else {
      await this.notifyBestEffort(workflow, 'QC_PASSED', QC_PASS_MESSAGE, historyRow.id);
    }

    await this.syncOrderStatus(workflow.orderId);
    return this.getInternal(workflow.id);
  }

  async advance(workflowId: string, dto: AdvanceWorkflowDto) {
    const workflow = await this.findOrThrow(workflowId);
    const allowed = ADVANCE_TRANSITIONS[workflow.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move from ${workflow.status} to ${dto.status}.`,
      });
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.fittingWorkflow.update({ where: { id: workflow.id }, data: { status: dto.status } });
      await tx.fittingStatusHistory.create({
        data: {
          fittingWorkflowId: workflow.id,
          status: dto.status,
          customerMessage: dto.customerMessage ?? CUSTOMER_MESSAGE[dto.status],
          actorSource: dto.actorSource,
        },
      });
    });

    await this.syncOrderStatus(workflow.orderId);
    return this.getInternal(workflow.id);
  }

  async uploadReadyPhoto(workflowId: string, dto: UploadReadyPhotoDto) {
    const workflow = await this.findOrThrow(workflowId);
    const bytes = Buffer.byteLength(dto.dataBase64, 'base64');
    if (bytes > MAX_PHOTO_BYTES) {
      throw new BadRequestException({
        code: 'PHOTO_TOO_LARGE',
        message: `Each photo must be at most ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))}MB.`,
      });
    }

    return this.prisma.client.garmentPhoto.create({
      data: {
        fittingWorkflowId: workflow.id,
        role: 'READY_PROOF',
        mimeType: dto.mimeType,
        dataBase64: dto.dataBase64,
        sizeBytes: bytes,
      },
      select: { id: true, role: true, mimeType: true, sizeBytes: true, createdAt: true },
    });
  }

  async markReady(workflowId: string, actorSource: string) {
    const workflow = await this.findOrThrow(workflowId);

    // Duplicate READY calls (e.g. a retried request) are a safe no-op once
    // the workflow has actually reached or passed READY — never re-run the
    // transition or error on a harmless repeat.
    if (workflow.status === 'READY' || workflow.status === 'COMPLETED') {
      return this.getInternal(workflow.id);
    }

    if (workflow.status !== 'QC') {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot mark ready from status ${workflow.status}.`,
      });
    }

    const lastQcCheck = await this.prisma.client.fittingInspection.findFirst({
      where: { fittingWorkflowId: workflow.id, stage: 'QC' },
      orderBy: { createdAt: 'desc' },
    });
    if (!lastQcCheck || lastQcCheck.outcome !== 'PASS') {
      throw new BadRequestException({
        code: 'QC_NOT_PASSED',
        message: 'Quality check must pass before this can be marked ready.',
      });
    }

    const proofCount = await this.prisma.client.garmentPhoto.count({
      where: { fittingWorkflowId: workflow.id, role: 'READY_PROOF' },
    });
    if (proofCount === 0) {
      throw new BadRequestException({
        code: 'READY_PROOF_MISSING',
        message: 'Ready-garment photos are required before this can be marked ready.',
      });
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.fittingWorkflow.update({ where: { id: workflow.id }, data: { status: 'READY' } });
      await tx.fittingStatusHistory.create({
        data: {
          fittingWorkflowId: workflow.id,
          status: 'READY',
          customerMessage: CUSTOMER_MESSAGE.READY,
          actorSource,
        },
      });
    });

    await this.syncOrderStatus(workflow.orderId);
    return this.getInternal(workflow.id);
  }

  /** Recomputes the order's overall customer-facing status from all of its
   * fitting workflows (the least-advanced one wins — an order is never
   * shown further along than its slowest fitting item) and appends
   * OrderStatusHistory only when it actually changes. Orders with no
   * fitting-eligible items are left untouched (they stay PLACED, matching
   * "no fitting workflow" for PRODUCT_ONLY). */
  private async syncOrderStatus(orderId: string) {
    const workflows = await this.prisma.client.fittingWorkflow.findMany({ where: { orderId } });
    if (workflows.length === 0) return;

    const derived = workflows.map((w) => ({ status: CUSTOMER_STATUS[w.status], message: CUSTOMER_MESSAGE[w.status] }));
    const anyCancelled = derived.find((d) => d.status === 'CANCELLED');
    const target = anyCancelled ?? derived.reduce((least, d) => (ORDER_STATUS_RANK[d.status] < ORDER_STATUS_RANK[least.status] ? d : least));

    const order = await this.prisma.client.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === target.status) return;

    const [, historyRow] = await this.prisma.client.$transaction([
      this.prisma.client.order.update({ where: { id: orderId }, data: { status: target.status } }),
      this.prisma.client.orderStatusHistory.create({
        data: { orderId, status: target.status, note: target.message },
      }),
    ]);

    if (target.status === 'READY') {
      try {
        await this.prisma.client.notification.create({
          data: {
            customerProfileId: order.customerProfileId,
            type: 'READY_FOR_DELIVERY',
            title: NOTIFICATION_TITLE.READY_FOR_DELIVERY,
            message: target.message,
            relatedOrderId: orderId,
            dedupeKey: `READY_FOR_DELIVERY:${historyRow.id}`,
          },
        });
      } catch {
        // Duplicate or transient failure — never block the status sync.
      }
    }
  }

  /** Best-effort — must never break a fitting operation that already
   * succeeded. `dedupeKey`'s unique index gives idempotency for free. */
  private async notifyBestEffort(
    workflow: { customerProfileId: string; orderId: string; orderItemId: string },
    type: NotificationType,
    message: string,
    dedupeSourceId: string,
  ) {
    try {
      await this.prisma.client.notification.create({
        data: {
          customerProfileId: workflow.customerProfileId,
          type,
          title: NOTIFICATION_TITLE[type],
          message,
          relatedOrderId: workflow.orderId,
          relatedOrderItemId: workflow.orderItemId,
          dedupeKey: `${type}:${dedupeSourceId}`,
        },
      });
    } catch {
      // Duplicate or transient failure — never block the fitting operation.
    }
  }

  private async findOrThrow(workflowId: string) {
    const workflow = await this.prisma.client.fittingWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) {
      throw new NotFoundException({ code: 'FITTING_WORKFLOW_NOT_FOUND', message: 'Fitting workflow not found.' });
    }
    return workflow;
  }
}
