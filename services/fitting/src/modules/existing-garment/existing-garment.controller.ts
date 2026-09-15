import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../common/own-user-id.guard';
import { CreateExistingGarmentRequestDto } from './dto/create-existing-garment-request.dto';
import { ExistingGarmentService } from './existing-garment.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/fitting/by-user/:userId/existing-garment')
@UseGuards(OwnUserIdGuard)
export class ExistingGarmentController {
  constructor(@Inject(ExistingGarmentService) private readonly service: ExistingGarmentService) {}

  @Post()
  create(@Param('userId') userId: string, @Body() dto: CreateExistingGarmentRequestDto) {
    return this.service.create(userId, dto);
  }
}
