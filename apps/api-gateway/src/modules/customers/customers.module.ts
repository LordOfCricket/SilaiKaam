import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [CustomersController],
  providers: [CustomersService, DownstreamHttpService],
})
export class CustomersModule {}
