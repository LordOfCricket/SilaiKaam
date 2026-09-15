import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../common/own-user-id.guard';
import { CreateCustomStitchingRequestDto } from './dto/create-custom-stitching-request.dto';
import { CustomStitchingService } from './custom-stitching.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/fitting/by-user/:userId/custom-stitching')
@UseGuards(OwnUserIdGuard)
export class CustomStitchingController {
  constructor(@Inject(CustomStitchingService) private readonly service: CustomStitchingService) {}

  @Post()
  create(@Param('userId') userId: string, @Body() dto: CreateCustomStitchingRequestDto) {
    return this.service.create(userId, dto);
  }
}
