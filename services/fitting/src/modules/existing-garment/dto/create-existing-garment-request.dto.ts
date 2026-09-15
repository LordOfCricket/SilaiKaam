import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import {
  GARMENT_CONDITIONS,
  GARMENT_PHOTO_ROLES,
  type GarmentCondition,
  type GarmentPhotoRole,
} from '@silaikaam/types';
import { ALLOWED_IMAGE_MIME_TYPES } from '@silaikaam/validation';

export class GarmentPhotoInputDto {
  @IsIn(GARMENT_PHOTO_ROLES)
  role!: GarmentPhotoRole;

  @IsIn(ALLOWED_IMAGE_MIME_TYPES)
  mimeType!: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  dataBase64!: string;
}

export class CreateExistingGarmentRequestDto {
  @IsString()
  @Length(2, 60, { message: 'Garment type is required.' })
  garmentType!: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  currentSize?: string;

  @IsIn(GARMENT_CONDITIONS)
  condition!: GarmentCondition;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  @IsOptional()
  @IsUUID()
  fitProfileId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one fitting service.' })
  @IsUUID(undefined, { each: true })
  selectedFittingServiceIds!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Upload at least one photo of the garment.' })
  @ValidateNested({ each: true })
  @Type(() => GarmentPhotoInputDto)
  photos!: GarmentPhotoInputDto[];
}
