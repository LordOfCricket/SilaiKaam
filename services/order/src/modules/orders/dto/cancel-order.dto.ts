import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const CANCELLATION_REASONS = [
  'CUSTOMER_CHANGED_MIND',
  'ORDERED_BY_MISTAKE',
  'DELIVERY_TOO_LATE',
  'WRONG_ITEM',
  'OTHER',
] as const;

export class CancelOrderDto {
  @IsIn(CANCELLATION_REASONS)
  reason!: (typeof CANCELLATION_REASONS)[number];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
