import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [OrdersController],
  providers: [OrdersService, DownstreamHttpService],
})
export class OrdersModule {}
