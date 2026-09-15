import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../customers/guards/own-user-id.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SupportService } from './support.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/customers/by-user/:userId/support/tickets')
@UseGuards(OwnUserIdGuard)
export class SupportController {
  constructor(@Inject(SupportService) private readonly supportService: SupportService) {}

  @Get()
  list(@Param('userId') userId: string) {
    return this.supportService.list(userId);
  }

  @Post()
  create(@Param('userId') userId: string, @Body() dto: CreateTicketDto) {
    return this.supportService.create(userId, dto);
  }

  @Get(':ticketId')
  get(@Param('userId') userId: string, @Param('ticketId') ticketId: string) {
    return this.supportService.get(userId, ticketId);
  }

  @Post(':ticketId/messages')
  addMessage(
    @Param('userId') userId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.addMessage(userId, ticketId, dto);
  }

  @Post(':ticketId/close')
  close(@Param('userId') userId: string, @Param('ticketId') ticketId: string) {
    return this.supportService.close(userId, ticketId);
  }
}
