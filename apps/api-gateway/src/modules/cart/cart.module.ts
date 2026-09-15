import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [CartController],
  providers: [CartService, DownstreamHttpService],
})
export class CartModule {}
