import { Module } from '@nestjs/common';
import { ExistingGarmentController } from './existing-garment.controller';
import { ExistingGarmentService } from './existing-garment.service';

@Module({
  controllers: [ExistingGarmentController],
  providers: [ExistingGarmentService],
})
export class ExistingGarmentModule {}
