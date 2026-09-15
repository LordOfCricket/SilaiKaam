import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

const REVIEW_TARGET_TYPES = ['PRODUCT', 'FITTING', 'CUSTOM_STITCHING'] as const;

export class CreateReviewDto {
  @IsUUID()
  orderItemId!: string;

  @IsIn(REVIEW_TARGET_TYPES)
  targetType!: (typeof REVIEW_TARGET_TYPES)[number];

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}
