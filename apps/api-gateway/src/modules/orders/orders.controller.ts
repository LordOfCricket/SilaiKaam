import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, OrderDetailDto, OrderSummaryDto, PlaceOrderResultDto } from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  placeOrder(@CurrentUser() user: AuthUser, @Body() dto: PlaceOrderDto): Promise<PlaceOrderResultDto> {
    return this.ordersService.placeOrder(user, dto);
  }

  @Get()
  listOrders(@CurrentUser() user: AuthUser): Promise<OrderSummaryDto[]> {
    return this.ordersService.listOrders(user);
  }

  @Get(':orderId')
  getOrder(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string): Promise<OrderDetailDto> {
    return this.ordersService.getOrder(user, orderId);
  }
}
