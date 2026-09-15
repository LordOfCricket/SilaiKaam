import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { GARMENT_CONDITIONS, type GarmentCondition } from '@silaikaam/types';

const INSPECTION_OUTCOMES = ['PASS', 'ACTION_REQUIRED', 'REJECTED'] as const;

export class RecordInspectionDto {
  @IsIn(INSPECTION_OUTCOMES)
  outcome!: (typeof INSPECTION_OUTCOMES)[number];

  @IsIn(GARMENT_CONDITIONS)
  garmentCondition!: GarmentCondition;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  observations?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  issues?: string;

  @IsOptional()
  @IsBoolean()
  requiresCustomerAction?: boolean;

  /** Required only when outcome is ACTION_REQUIRED — the customer-safe text
   * describing what's needed. */
  @IsOptional()
  @IsString()
  @Length(1, 300)
  requestedInfo?: string;

  @IsString()
  @Length(1, 40)
  actorSource!: string;
}
