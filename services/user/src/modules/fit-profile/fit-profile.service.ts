import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertFitProfileDto } from './dto/upsert-fit-profile.dto';

@Injectable()
export class FitProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    return this.prisma.client.fitProfile.findFirst({
      where: { customerProfileId: profile.id, isActive: true },
      include: { measurements: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Single-profile V1: creates the customer's one fit profile if none
   * exists yet, otherwise replaces it in place. The schema is one-to-many
   * so a later batch can add a real "multiple profiles" UI without a
   * migration. */
  async upsertByUserId(userId: string, dto: UpsertFitProfileDto) {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const dedupedMeasurements = Array.from(
      new Map(dto.measurements.map((m) => [m.key, m.value])).entries(),
    );

    const existing = await this.prisma.client.fitProfile.findFirst({
      where: { customerProfileId: profile.id, isActive: true },
    });

    return this.prisma.client.$transaction(async (tx) => {
      const fitProfile = existing
        ? await tx.fitProfile.update({
            where: { id: existing.id },
            data: { label: dto.label, fitPreference: dto.fitPreference, notes: dto.notes || null },
          })
        : await tx.fitProfile.create({
            data: {
              customerProfileId: profile.id,
              label: dto.label,
              fitPreference: dto.fitPreference,
              notes: dto.notes || null,
            },
          });

      await tx.fitMeasurement.deleteMany({ where: { fitProfileId: fitProfile.id } });
      if (dedupedMeasurements.length > 0) {
        await tx.fitMeasurement.createMany({
          data: dedupedMeasurements.map(([key, value]) => ({
            fitProfileId: fitProfile.id,
            key,
            value,
          })),
        });
      }

      return tx.fitProfile.findUniqueOrThrow({
        where: { id: fitProfile.id },
        include: { measurements: true },
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
