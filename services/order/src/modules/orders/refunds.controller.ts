import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { ProcessRefundDto } from './dto/process-refund.dto';

// Internal-only ops surface (not routed through the API Gateway) — no
// payment provider or staff UI exists yet; this only lets the refund
// lifecycle be exercised/tested, never a customer-facing trigger.
@Controller('internal/refunds')
export class RefundsController {
  constructor(@Inject(RefundsService) private readonly refundsService: RefundsService) {}

  @Post(':id/process')
  process(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    return this.refundsService.process(id, dto.status);
  }
}
