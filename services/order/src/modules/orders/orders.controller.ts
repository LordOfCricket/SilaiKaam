import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OwnUserIdGuard } from '../cart/own-user-id.guard';
import { CancellationService } from './cancellation.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RespondActionRequestDto } from './dto/respond-action-request.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { DisputesService } from './disputes.service';
import { OrdersService } from './orders.service';
import { RefundsService } from './refunds.service';
import { ReorderService } from './reorder.service';
import { ReviewsService } from './reviews.service';

// Internal-only surface: reachable exclusively from the API Gateway.
@Controller('internal/orders/by-user/:userId')
@UseGuards(OwnUserIdGuard)
export class OrdersController {
  constructor(
    @Inject(OrdersService) private readonly ordersService: OrdersService,
    @Inject(ReviewsService) private readonly reviewsService: ReviewsService,
    @Inject(ReorderService) private readonly reorderService: ReorderService,
    @Inject(CancellationService) private readonly cancellationService: CancellationService,
    @Inject(RefundsService) private readonly refundsService: RefundsService,
    @Inject(DisputesService) private readonly disputesService: DisputesService,
  ) {}

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

  @Post(':orderId/action-requests/:actionRequestId/respond')
  respondToActionRequest(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
    @Param('actionRequestId') actionRequestId: string,
    @Body() dto: RespondActionRequestDto,
  ) {
    return this.ordersService.respondToActionRequest(userId, orderId, actionRequestId, dto);
  }

  @Post(':orderId/reviews')
  createReview(@Param('userId') userId: string, @Param('orderId') orderId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, orderId, dto);
  }

  @Get(':orderId/reviews')
  listReviews(@Param('userId') userId: string, @Param('orderId') orderId: string) {
    return this.reviewsService.list(userId, orderId);
  }

  @Patch(':orderId/reviews/:reviewId')
  updateReview(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(userId, orderId, reviewId, dto);
  }

  @Post(':orderId/items/:itemId/reorder')
  reorder(@Param('userId') userId: string, @Param('orderId') orderId: string, @Param('itemId') itemId: string) {
    return this.reorderService.reorder(userId, orderId, itemId);
  }

  @Post(':orderId/cancel')
  cancel(@Param('userId') userId: string, @Param('orderId') orderId: string, @Body() dto: CancelOrderDto) {
    return this.cancellationService.cancel(userId, orderId, dto);
  }

  @Get(':orderId/refunds')
  listRefunds(@Param('userId') userId: string, @Param('orderId') orderId: string) {
    return this.refundsService.list(userId, orderId);
  }

  @Post(':orderId/disputes')
  createDispute(@Param('userId') userId: string, @Param('orderId') orderId: string, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(userId, orderId, dto);
  }

  @Get(':orderId/disputes')
  listDisputes(@Param('userId') userId: string, @Param('orderId') orderId: string) {
    return this.disputesService.list(userId, orderId);
  }

  @Get(':orderId/disputes/:disputeId')
  getDispute(
    @Param('userId') userId: string,
    @Param('orderId') orderId: string,
    @Param('disputeId') disputeId: string,
  ) {
    return this.disputesService.get(userId, orderId, disputeId);
  }
}
