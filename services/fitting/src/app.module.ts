import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExistingGarmentModule } from './modules/existing-garment/existing-garment.module';
import { CustomStitchingModule } from './modules/custom-stitching/custom-stitching.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    ExistingGarmentModule,
    CustomStitchingModule,
  ],
})
export class AppModule {}
