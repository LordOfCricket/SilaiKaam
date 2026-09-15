import { IsString, IsUUID, Length } from 'class-validator';

// Called once, internally, right after identity-service creates the auth
// record — this is the "customer profile foundation" half of registration.
export class CreateCustomerDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @Length(2, 80)
  fullName!: string;
}
