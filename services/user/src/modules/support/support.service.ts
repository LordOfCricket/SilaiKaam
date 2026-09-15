import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupportMessageDto, SupportTicketDetailDto, SupportTicketSummaryDto } from '@silaikaam/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class SupportService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<SupportTicketSummaryDto[]> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const tickets = await this.prisma.client.supportTicket.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => this.toSummaryDto(t));
  }

  async create(userId: string, dto: CreateTicketDto): Promise<SupportTicketDetailDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);

    if (dto.orderId) {
      const order = await this.prisma.client.order.findUnique({ where: { id: dto.orderId } });
      if (!order || order.customerProfileId !== profile.id) {
        throw new BadRequestException({ code: 'ORDER_INVALID', message: 'Select a valid order.' });
      }
    }

    const ticket = await this.prisma.client.supportTicket.create({
      data: {
        customerProfileId: profile.id,
        category: dto.category,
        orderId: dto.orderId ?? null,
        subject: dto.subject,
        description: dto.description,
      },
      include: { messages: true },
    });
    return this.toDetailDto(ticket);
  }

  async get(userId: string, ticketId: string): Promise<SupportTicketDetailDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const ticket = await this.findOwnedTicketOrThrow(profile.id, ticketId);
    return this.toDetailDto(ticket);
  }

  async addMessage(userId: string, ticketId: string, dto: CreateMessageDto): Promise<SupportTicketDetailDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const ticket = await this.findOwnedTicketOrThrow(profile.id, ticketId);

    if (ticket.status === 'CLOSED') {
      throw new BadRequestException({
        code: 'TICKET_CLOSED',
        message: 'This ticket is closed. Please open a new ticket if you need further help.',
      });
    }

    await this.prisma.client.supportMessage.create({
      data: { ticketId: ticket.id, senderType: 'CUSTOMER', message: dto.message },
    });
    // A new customer message means the ticket is waiting on support again.
    if (ticket.status === 'WAITING_FOR_CUSTOMER') {
      await this.prisma.client.supportTicket.update({ where: { id: ticket.id }, data: { status: 'OPEN' } });
    }

    const updated = await this.prisma.client.supportTicket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toDetailDto(updated);
  }

  async close(userId: string, ticketId: string): Promise<SupportTicketDetailDto> {
    const profile = await this.findCustomerProfileOrThrow(userId);
    const ticket = await this.findOwnedTicketOrThrow(profile.id, ticketId);

    if (ticket.status === 'CLOSED') {
      return this.toDetailDto(ticket); // idempotent
    }

    const updated = await this.prisma.client.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toDetailDto(updated);
  }

  private async findOwnedTicketOrThrow(customerProfileId: string, ticketId: string) {
    const ticket = await this.prisma.client.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket || ticket.customerProfileId !== customerProfileId) {
      throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Support ticket not found.' });
    }
    return ticket;
  }

  private toSummaryDto(ticket: {
    id: string;
    category: SupportTicketSummaryDto['category'];
    subject: string;
    status: SupportTicketSummaryDto['status'];
    orderId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SupportTicketSummaryDto {
    return {
      id: ticket.id,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      orderId: ticket.orderId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }

  private toDetailDto(ticket: {
    id: string;
    category: SupportTicketSummaryDto['category'];
    subject: string;
    description: string;
    status: SupportTicketSummaryDto['status'];
    orderId: string | null;
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    messages: { id: string; senderType: SupportMessageDto['senderType']; message: string; createdAt: Date }[];
  }): SupportTicketDetailDto {
    return {
      ...this.toSummaryDto(ticket),
      description: ticket.description,
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      })),
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
