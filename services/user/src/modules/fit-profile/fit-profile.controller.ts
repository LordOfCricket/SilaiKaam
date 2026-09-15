import { Body, Controller, Get, Inject, Param, Put, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../customers/guards/own-user-id.guard';
import { FitProfileService } from './fit-profile.service';
import { UpsertFitProfileDto } from './dto/upsert-fit-profile.dto';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/customers/by-user/:userId/fit-profile')
@UseGuards(OwnUserIdGuard)
export class FitProfileController {
  constructor(@Inject(FitProfileService) private readonly fitProfileService: FitProfileService) {}

  @Get()
  findByUserId(@Param('userId') userId: string) {
    return this.fitProfileService.findByUserId(userId);
  }

  @Put()
  upsert(@Param('userId') userId: string, @Body() dto: UpsertFitProfileDto) {
    return this.fitProfileService.upsertByUserId(userId, dto);
  }
}
