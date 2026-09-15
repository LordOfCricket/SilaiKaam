import { IsUUID } from 'class-validator';

export class PlaceOrderDto {
  @IsUUID()
  addressId!: string;

  @IsUUID()
  idempotencyKey!: string;
}
