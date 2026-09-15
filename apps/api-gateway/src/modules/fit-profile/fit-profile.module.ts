import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { FitProfileController } from './fit-profile.controller';
import { FitProfileService } from './fit-profile.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [FitProfileController],
  providers: [FitProfileService, DownstreamHttpService],
})
export class FitProfileModule {}
