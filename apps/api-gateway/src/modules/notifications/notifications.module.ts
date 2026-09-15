import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DownstreamHttpService],
})
export class NotificationsModule {}
