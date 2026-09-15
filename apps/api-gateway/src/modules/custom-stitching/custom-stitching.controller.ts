import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, CustomStitchingRequestDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateCustomStitchingRequestDto } from './dto/create-custom-stitching-request.dto';
import { CustomStitchingService } from './custom-stitching.service';

@Controller('custom-stitching')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CustomStitchingController {
  constructor(@Inject(CustomStitchingService) private readonly service: CustomStitchingService) {}

  @Post('requests')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCustomStitchingRequestDto,
  ): Promise<CustomStitchingRequestDto> {
    return this.service.create(user, dto);
  }
}
