import { IsIn, IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

const GENDER_OPTIONS = ['female', 'male', 'other', 'prefer_not_to_say'] as const;

export class UpdateProfileDto {
  @IsString()
  @Length(2, 80, { message: 'Full name must be between 2 and 80 characters.' })
  fullName!: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Enter a valid phone number.' })
  phone?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(GENDER_OPTIONS, { message: 'Select a valid gender option.' })
  gender?: (typeof GENDER_OPTIONS)[number];

  @IsOptional()
  @IsUrl({}, { message: 'Enter a valid URL.' })
  avatarUrl?: string;
}
