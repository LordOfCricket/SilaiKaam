import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CancellationService } from './cancellation.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DisputesService } from './disputes.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { ReorderService } from './reorder.service';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [CartModule],
  controllers: [OrdersController, DeliveryController, RefundsController],
  providers: [
    OrdersService,
    DeliveryService,
    ReviewsService,
    ReorderService,
    CancellationService,
    RefundsService,
    DisputesService,
  ],
})
export class OrdersModule {}
