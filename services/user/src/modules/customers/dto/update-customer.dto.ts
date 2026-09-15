import { IsIn, IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

const GENDER_OPTIONS = ['female', 'male', 'other', 'prefer_not_to_say'] as const;

export class UpdateCustomerDto {
  @IsString()
  @Length(2, 80)
  fullName!: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Enter a valid phone number.' })
  phone?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(GENDER_OPTIONS)
  gender?: (typeof GENDER_OPTIONS)[number];

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
