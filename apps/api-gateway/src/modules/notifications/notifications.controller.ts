import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthUser, NotificationDto, NotificationListResultDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationListResultDto> {
    return this.notificationsService.list(user, unreadOnly === 'true', limit ? Number(limit) : undefined);
  }

  @Post(':notificationId/read')
  markRead(@CurrentUser() user: AuthUser, @Param('notificationId') notificationId: string): Promise<NotificationDto> {
    return this.notificationsService.markRead(user, notificationId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(user);
  }
}
