import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { RespondActionRequestDto } from './dto/respond-action-request.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  placeOrder(user: AuthUser, dto: PlaceOrderDto): Promise<PlaceOrderResultDto> {
    return this.http.request<PlaceOrderResultDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}`,
      body: dto,
      headers: this.headers(user),
    });
  }

  listOrders(user: AuthUser): Promise<OrderSummaryDto[]> {
    return this.http.request<OrderSummaryDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}`,
      headers: this.headers(user),
    });
  }

  getOrder(user: AuthUser, orderId: string): Promise<OrderDetailDto> {
    return this.http.request<OrderDetailDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}`,
      headers: this.headers(user),
    });
  }

  respondToActionRequest(
    user: AuthUser,
    orderId: string,
    actionRequestId: string,
    dto: RespondActionRequestDto,
  ): Promise<RespondActionRequestResultDto> {
    return this.http.request<RespondActionRequestResultDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/action-requests/${actionRequestId}/respond`,
      body: dto,
      headers: this.headers(user),
    });
  }

  createReview(user: AuthUser, orderId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    return this.http.request<ReviewDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/reviews`,
      body: dto,
      headers: this.headers(user),
    });
  }

  listReviews(user: AuthUser, orderId: string): Promise<ReviewDto[]> {
    return this.http.request<ReviewDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/reviews`,
      headers: this.headers(user),
    });
  }

  updateReview(user: AuthUser, orderId: string, reviewId: string, dto: UpdateReviewDto): Promise<ReviewDto> {
    return this.http.request<ReviewDto>({
      method: 'PATCH',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/reviews/${reviewId}`,
      body: dto,
      headers: this.headers(user),
    });
  }

  reorder(user: AuthUser, orderId: string, itemId: string): Promise<ReorderResultDto> {
    return this.http.request<ReorderResultDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/items/${itemId}/reorder`,
      headers: this.headers(user),
    });
  }

  cancelOrder(user: AuthUser, orderId: string, dto: CancelOrderDto): Promise<CancelOrderResultDto> {
    return this.http.request<CancelOrderResultDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/cancel`,
      body: dto,
      headers: this.headers(user),
    });
  }

  listRefunds(user: AuthUser, orderId: string): Promise<RefundDto[]> {
    return this.http.request<RefundDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/refunds`,
      headers: this.headers(user),
    });
  }

  createDispute(user: AuthUser, orderId: string, dto: CreateDisputeDto): Promise<DisputeDto> {
    return this.http.request<DisputeDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/disputes`,
      body: dto,
      headers: this.headers(user),
    });
  }

  listDisputes(user: AuthUser, orderId: string): Promise<DisputeDto[]> {
    return this.http.request<DisputeDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/disputes`,
      headers: this.headers(user),
    });
  }

  getDispute(user: AuthUser, orderId: string, disputeId: string): Promise<DisputeDto> {
    return this.http.request<DisputeDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/orders/by-user/${user.id}/${orderId}/disputes/${disputeId}`,
      headers: this.headers(user),
    });
  }

  private baseUrl(): string {
    return this.config.get('ORDER_SERVICE_URL', { infer: true });
  }

  private headers(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }
}
