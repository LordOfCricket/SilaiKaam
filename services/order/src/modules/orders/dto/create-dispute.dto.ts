import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const DISPUTE_TYPES = [
  'FIT_ISSUE',
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'MISSING_ITEM',
  'QUALITY_ISSUE',
  'DELIVERY_ISSUE',
  'OTHER',
] as const;

export class CreateDisputeDto {
  @IsIn(DISPUTE_TYPES)
  type!: (typeof DISPUTE_TYPES)[number];

  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @IsString()
  @Length(10, 2000)
  description!: string;
}
