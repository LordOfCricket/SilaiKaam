import { Module } from '@nestjs/common';
import { FitProfileController } from './fit-profile.controller';
import { FitProfileService } from './fit-profile.service';

@Module({
  controllers: [FitProfileController],
  providers: [FitProfileService],
})
export class FitProfileModule {}
