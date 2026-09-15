import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [SupportController],
  providers: [SupportService, DownstreamHttpService],
})
export class SupportModule {}
