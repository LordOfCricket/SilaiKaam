import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @Length(0, 40)
  label?: string;

  @IsString()
  @Length(3, 120)
  line1!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  line2?: string;

  @IsString()
  @Length(2, 60)
  city!: string;

  @IsString()
  @Length(2, 60)
  state!: string;

  @Matches(/^[A-Za-z0-9\- ]{3,12}$/, { message: 'Enter a valid postal code.' })
  postalCode!: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
