import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationDto, NotificationListResultDto } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, options: { unreadOnly?: boolean; limit?: number } = {}): Promise<NotificationListResultDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const where = { customerProfileId: profile.id, ...(options.unreadOnly ? { isRead: false } : {}) };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.client.notification.count({ where }),
      this.prisma.client.notification.count({ where: { customerProfileId: profile.id, isRead: false } }),
    ]);

    return { items: items.map((n) => this.toDto(n)), unreadCount, total };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const notification = await this.prisma.client.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.customerProfileId !== profile.id) {
      throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' });
    }
    if (notification.isRead) return this.toDto(notification);

    const updated = await this.prisma.client.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return this.toDto(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const result = await this.prisma.client.notification.updateMany({
      where: { customerProfileId: profile.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  private toDto(notification: {
    id: string;
    type: NotificationDto['type'];
    title: string;
    message: string;
    relatedOrderId: string | null;
    relatedOrderItemId: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedOrderId: notification.relatedOrderId,
      relatedOrderItemId: notification.relatedOrderItemId,
      isRead: notification.isRead,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private async findCustomerProfileOrThrow(userId: string) {
    const profile = await this.prisma.client.customerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ code: 'CUSTOMER_PROFILE_NOT_FOUND', message: 'Profile not found.' });
    }
    return profile;
  }
}
