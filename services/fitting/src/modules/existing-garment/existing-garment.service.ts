import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_PHOTO_BYTES } from '@silaikaam/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExistingGarmentRequestDto } from './dto/create-existing-garment-request.dto';

@Injectable()
export class ExistingGarmentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateExistingGarmentRequestDto) {
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

    const validServices = await this.prisma.client.fittingService.findMany({
      where: { id: { in: dto.selectedFittingServiceIds }, isActive: true },
    });
    if (validServices.length !== new Set(dto.selectedFittingServiceIds).size) {
      throw new BadRequestException({
        code: 'FITTING_SERVICE_UNAVAILABLE',
        message: 'One or more selected fitting services are no longer available.',
      });
    }

    const requiredMeasurements = new Set(validServices.flatMap((s) => s.requiredMeasurements));
    if (requiredMeasurements.size > 0) {
      const haveMeasurements = dto.fitProfileId
        ? new Set(
            (
              await this.prisma.client.fitMeasurement.findMany({
                where: { fitProfileId: dto.fitProfileId },
              })
            ).map((m) => m.key),
          )
        : new Set<string>();
      const missing = [...requiredMeasurements].filter((k) => !haveMeasurements.has(k));
      if (missing.length > 0) {
        throw new BadRequestException({
          code: 'MEASUREMENT_MISSING',
          message: `Your Fit Profile needs: ${missing.join(', ')}. Update your Fit Profile before continuing.`,
        });
      }
    }

    for (const photo of dto.photos) {
      const bytes = Buffer.byteLength(photo.dataBase64, 'base64');
      if (bytes > MAX_PHOTO_BYTES) {
        throw new BadRequestException({
          code: 'PHOTO_TOO_LARGE',
          message: `Each photo must be at most ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))}MB.`,
        });
      }
    }

    const request = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.existingGarmentRequest.create({
        data: {
          customerProfileId: profile.id,
          garmentType: dto.garmentType,
          brand: dto.brand || null,
          currentSize: dto.currentSize || null,
          condition: dto.condition,
          notes: dto.notes || null,
          fitProfileId: dto.fitProfileId ?? null,
          selectedFittingServiceIds: dto.selectedFittingServiceIds,
        },
      });

      await tx.garmentPhoto.createMany({
        data: dto.photos.map((p) => ({
          requestId: created.id,
          role: p.role,
          mimeType: p.mimeType,
          dataBase64: p.dataBase64,
          sizeBytes: Buffer.byteLength(p.dataBase64, 'base64'),
        })),
      });

      return tx.existingGarmentRequest.findUniqueOrThrow({
        where: { id: created.id },
        include: { photos: { select: { id: true, role: true, mimeType: true, sizeBytes: true } } },
      });
    });

    return request;
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
