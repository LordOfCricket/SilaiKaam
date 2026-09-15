import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, OrderDetailDto, OrderSummaryDto, PlaceOrderResultDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { PlaceOrderDto } from './dto/place-order.dto';

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

  private baseUrl(): string {
    return this.config.get('ORDER_SERVICE_URL', { infer: true });
  }

  private headers(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }
}
