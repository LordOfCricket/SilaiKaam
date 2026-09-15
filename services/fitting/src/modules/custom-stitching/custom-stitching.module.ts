import { Module } from '@nestjs/common';
import { CustomStitchingController } from './custom-stitching.controller';
import { CustomStitchingService } from './custom-stitching.service';

@Module({
  controllers: [CustomStitchingController],
  providers: [CustomStitchingService],
})
export class CustomStitchingModule {}
