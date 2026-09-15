import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { ALLOWED_IMAGE_MIME_TYPES } from '@silaikaam/validation';

export class ReferenceImageInputDto {
  @IsIn(ALLOWED_IMAGE_MIME_TYPES)
  mimeType!: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  dataBase64!: string;
}

export class CreateCustomStitchingRequestDto {
  @IsString()
  @Length(2, 60, { message: 'Garment type is required.' })
  garmentType!: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  fabricDetails?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  designDetails?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  specialRequirements?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  fitProfileId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ReferenceImageInputDto)
  referenceImages?: ReferenceImageInputDto[];
}
