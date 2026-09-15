import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, ExistingGarmentRequestDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateExistingGarmentRequestDto } from './dto/create-existing-garment-request.dto';
import { ExistingGarmentService } from './existing-garment.service';

@Controller('existing-garment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class ExistingGarmentController {
  constructor(@Inject(ExistingGarmentService) private readonly service: ExistingGarmentService) {}

  @Post('requests')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExistingGarmentRequestDto,
  ): Promise<ExistingGarmentRequestDto> {
    return this.service.create(user, dto);
  }
}
