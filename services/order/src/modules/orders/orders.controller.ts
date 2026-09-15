import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../cart/own-user-id.guard';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrdersService } from './orders.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/orders/by-user/:userId')
@UseGuards(OwnUserIdGuard)
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post()
  placeOrder(@Param('userId') userId: string, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(userId, dto);
  }

  @Get()
  listOrders(@Param('userId') userId: string) {
    return this.ordersService.listOrders(userId);
  }

  @Get(':orderId')
  getOrder(@Param('userId') userId: string, @Param('orderId') orderId: string) {
    return this.ordersService.getOrder(userId, orderId);
  }
}
