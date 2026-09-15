import { IsIn, IsString, Length } from 'class-validator';

const DELIVERY_TARGETS = ['OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'DELIVERY_RESCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

export class AdvanceDeliveryDto {
  @IsIn(DELIVERY_TARGETS)
  status!: (typeof DELIVERY_TARGETS)[number];

  @IsString()
  @Length(1, 40)
  actorSource!: string;
}
