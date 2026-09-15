import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const SUPPORT_CATEGORIES = ['ORDER', 'FITTING', 'DELIVERY', 'PRODUCT', 'ACCOUNT', 'OTHER'] as const;

export class CreateTicketDto {
  @IsIn(SUPPORT_CATEGORIES)
  category!: (typeof SUPPORT_CATEGORIES)[number];

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsString()
  @Length(3, 120)
  subject!: string;

  @IsString()
  @Length(10, 2000)
  description!: string;
}
