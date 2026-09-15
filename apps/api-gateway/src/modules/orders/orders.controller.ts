import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type {
  AuthUser,
  CancelOrderResultDto,
  DisputeDto,
  OrderDetailDto,
  OrderSummaryDto,
  PlaceOrderResultDto,
  ReorderResultDto,
  RefundDto,
  RespondActionRequestResultDto,
  ReviewDto,
} from '@silaikaam/types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RespondActionRequestDto } from './dto/respond-action-request.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
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

  @Post(':orderId/action-requests/:actionRequestId/respond')
  respondToActionRequest(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('actionRequestId') actionRequestId: string,
    @Body() dto: RespondActionRequestDto,
  ): Promise<RespondActionRequestResultDto> {
    return this.ordersService.respondToActionRequest(user, orderId, actionRequestId, dto);
  }

  @Post(':orderId/reviews')
  createReview(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    return this.ordersService.createReview(user, orderId, dto);
  }

  @Get(':orderId/reviews')
  listReviews(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string): Promise<ReviewDto[]> {
    return this.ordersService.listReviews(user, orderId);
  }

  @Patch(':orderId/reviews/:reviewId')
  updateReview(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewDto> {
    return this.ordersService.updateReview(user, orderId, reviewId, dto);
  }

  @Post(':orderId/items/:itemId/reorder')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ): Promise<ReorderResultDto> {
    return this.ordersService.reorder(user, orderId, itemId);
  }

  @Post(':orderId/cancel')
  cancelOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<CancelOrderResultDto> {
    return this.ordersService.cancelOrder(user, orderId, dto);
  }

  @Get(':orderId/refunds')
  listRefunds(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string): Promise<RefundDto[]> {
    return this.ordersService.listRefunds(user, orderId);
  }

  @Post(':orderId/disputes')
  createDispute(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateDisputeDto,
  ): Promise<DisputeDto> {
    return this.ordersService.createDispute(user, orderId, dto);
  }

  @Get(':orderId/disputes')
  listDisputes(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string): Promise<DisputeDto[]> {
    return this.ordersService.listDisputes(user, orderId);
  }

  @Get(':orderId/disputes/:disputeId')
  getDispute(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Param('disputeId') disputeId: string,
  ): Promise<DisputeDto> {
    return this.ordersService.getDispute(user, orderId, disputeId);
  }
}
