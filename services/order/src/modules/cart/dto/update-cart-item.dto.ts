import { IsInt, Max, Min } from 'class-validator';
import { MAX_CART_QUANTITY } from '@silaikaam/validation';

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity!: number;
}
