import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import type { AuthUser, FitProfileDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { FitProfileService } from './fit-profile.service';
import { UpsertFitProfileDto } from './dto/upsert-fit-profile.dto';

// "me"-scoped only — the authenticated customer's own fit profile, never
// another customer's id.
@Controller('fit-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class FitProfileController {
  constructor(@Inject(FitProfileService) private readonly fitProfileService: FitProfileService) {}

  @Get()
  getOwn(@CurrentUser() user: AuthUser): Promise<FitProfileDto | null> {
    return this.fitProfileService.getOwn(user);
  }

  @Put()
  upsertOwn(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertFitProfileDto,
  ): Promise<FitProfileDto> {
    return this.fitProfileService.upsertOwn(user, dto);
  }
}
