import { IsIn } from 'class-validator';

const REFUND_TARGETS = ['PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as const;

export class ProcessRefundDto {
  @IsIn(REFUND_TARGETS)
  status!: (typeof REFUND_TARGETS)[number];
}
