import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { ExistingGarmentController } from './existing-garment.controller';
import { ExistingGarmentService } from './existing-garment.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [ExistingGarmentController],
  providers: [ExistingGarmentService, DownstreamHttpService],
})
export class ExistingGarmentModule {}
