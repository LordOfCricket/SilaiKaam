import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CART_ITEM_TYPES, type CartItemType } from '@silaikaam/types';
import { MAX_CART_QUANTITY } from '@silaikaam/validation';

const PRODUCT_TYPES = ['PRODUCT_ONLY', 'BUY_FIT'];

export class AddCartItemDto {
  @IsIn(CART_ITEM_TYPES)
  type!: CartItemType;

  @ValidateIf((o: AddCartItemDto) => PRODUCT_TYPES.includes(o.type))
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ValidateIf((o: AddCartItemDto) => PRODUCT_TYPES.includes(o.type))
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity?: number;

  @ValidateIf((o: AddCartItemDto) => o.type === 'BUY_FIT')
  @IsUUID()
  fitProfileId?: string;

  @ValidateIf((o: AddCartItemDto) => o.type === 'BUY_FIT')
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one fitting service.' })
  @IsUUID(undefined, { each: true })
  selectedFittingServiceIds?: string[];

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  @ValidateIf((o: AddCartItemDto) => o.type === 'EXISTING_GARMENT')
  @IsUUID()
  existingGarmentRequestId?: string;

  @ValidateIf((o: AddCartItemDto) => o.type === 'CUSTOM_STITCHING')
  @IsUUID()
  customStitchingRequestId?: string;
}
