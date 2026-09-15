import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../customers/guards/own-user-id.guard';
import { NotificationsService } from './notifications.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/customers/by-user/:userId/notifications')
@UseGuards(OwnUserIdGuard)
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.list(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':notificationId/read')
  markRead(@Param('userId') userId: string, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markRead(userId, notificationId);
  }

  @Post('read-all')
  markAllRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
