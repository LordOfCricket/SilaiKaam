import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, SupportTicketDetailDto, SupportTicketSummaryDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportService } from './support.service';

@Controller('support/tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class SupportController {
  constructor(@Inject(SupportService) private readonly supportService: SupportService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SupportTicketSummaryDto[]> {
    return this.supportService.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto): Promise<SupportTicketDetailDto> {
    return this.supportService.create(user, dto);
  }

  @Get(':ticketId')
  get(@CurrentUser() user: AuthUser, @Param('ticketId') ticketId: string): Promise<SupportTicketDetailDto> {
    return this.supportService.get(user, ticketId);
  }

  @Post(':ticketId/messages')
  addMessage(
    @CurrentUser() user: AuthUser,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<SupportTicketDetailDto> {
    return this.supportService.addMessage(user, ticketId, dto);
  }

  @Post(':ticketId/close')
  close(@CurrentUser() user: AuthUser, @Param('ticketId') ticketId: string): Promise<SupportTicketDetailDto> {
    return this.supportService.close(user, ticketId);
  }
}
