import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CustomStitchingController } from './custom-stitching.controller';
import { CustomStitchingService } from './custom-stitching.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [CustomStitchingController],
  providers: [CustomStitchingService, DownstreamHttpService],
})
export class CustomStitchingModule {}
