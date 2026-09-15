import { Module } from '@nestjs/common';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService, DownstreamHttpService],
})
export class MarketplaceModule {}
