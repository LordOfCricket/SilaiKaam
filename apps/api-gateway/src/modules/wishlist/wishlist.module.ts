import { Module } from '@nestjs/common';
import { AuthCommonModule } from '../../common/auth/auth-common.module';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [AuthCommonModule],
  controllers: [WishlistController],
  providers: [WishlistService, DownstreamHttpService],
})
export class WishlistModule {}
