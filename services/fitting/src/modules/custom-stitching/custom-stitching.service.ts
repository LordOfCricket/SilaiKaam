import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_PHOTO_BYTES } from '@silaikaam/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomStitchingRequestDto } from './dto/create-custom-stitching-request.dto';

@Injectable()
export class CustomStitchingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCustomStitchingRequestDto) {
    const profile = await this.findCustomerProfileOrThrow(userId);

    if (dto.fitProfileId) {
      const owned = await this.prisma.client.fitProfile.findFirst({
        where: { id: dto.fitProfileId, customerProfileId: profile.id },
      });
      if (!owned) {
        throw new ForbiddenException({
          code: 'FIT_PROFILE_NOT_OWNED',
          message: 'This fit profile does not belong to you.',
        });
      }
    }

    for (const image of dto.referenceImages ?? []) {
      const bytes = Buffer.byteLength(image.dataBase64, 'base64');
      if (bytes > MAX_PHOTO_BYTES) {
        throw new BadRequestException({
          code: 'PHOTO_TOO_LARGE',
          message: `Each image must be at most ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))}MB.`,
        });
      }
    }

    return this.prisma.client.$transaction(async (tx) => {
      const created = await tx.customStitchingRequest.create({
        data: {
          customerProfileId: profile.id,
          garmentType: dto.garmentType,
          fabricDetails: dto.fabricDetails || null,
          designDetails: dto.designDetails || null,
          color: dto.color || null,
          specialRequirements: dto.specialRequirements || null,
          notes: dto.notes || null,
          fitProfileId: dto.fitProfileId ?? null,
        },
      });

      if (dto.referenceImages && dto.referenceImages.length > 0) {
        await tx.customStitchingReferenceImage.createMany({
          data: dto.referenceImages.map((img) => ({
            requestId: created.id,
            mimeType: img.mimeType,
            dataBase64: img.dataBase64,
            sizeBytes: Buffer.byteLength(img.dataBase64, 'base64'),
          })),
        });
      }

      return tx.customStitchingRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: { referenceImages: { select: { id: true, mimeType: true, sizeBytes: true } } },
      });
    });
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        code: 'CUSTOMER_PROFILE_NOT_FOUND',
        message: 'Profile not found.',
      });
    }
    return profile;
  }
}
