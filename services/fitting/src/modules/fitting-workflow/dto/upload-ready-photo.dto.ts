import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ALLOWED_IMAGE_MIME_TYPES } from '@silaikaam/validation';

export class UploadReadyPhotoDto {
  @IsIn(ALLOWED_IMAGE_MIME_TYPES)
  mimeType!: (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  dataBase64!: string;
}
