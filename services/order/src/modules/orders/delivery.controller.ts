import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { AdvanceDeliveryDto } from './dto/advance-delivery.dto';

// Internal-only ops surface (not routed through the API Gateway) — mirrors
// fitting-service's `/internal/fitting-workflow/*` trust model: no staff UI
// exists yet, reachable only from trusted backend tooling on this network.
@Controller('internal/delivery/:orderId')
export class DeliveryController {
  constructor(@Inject(DeliveryService) private readonly service: DeliveryService) {}

  @Post('prepare')
  beginPreparingForDelivery(@Param('orderId') orderId: string, @Body('actorSource') actorSource: string) {
    return this.service.beginPreparingForDelivery(orderId, actorSource);
  }

  @Post('advance')
  advance(@Param('orderId') orderId: string, @Body() dto: AdvanceDeliveryDto) {
    return this.service.advance(orderId, dto.status, dto.actorSource);
  }
}
