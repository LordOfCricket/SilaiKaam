import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, CartDto, CartItemDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  getCart(user: AuthUser): Promise<CartDto> {
    return this.http.request<CartDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/cart/by-user/${user.id}`,
      headers: this.headers(user),
    });
  }

  addItem(user: AuthUser, dto: AddCartItemDto): Promise<CartItemDto> {
    return this.http.request<CartItemDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/cart/by-user/${user.id}/items`,
      body: dto,
      headers: this.headers(user),
    });
  }

  updateItem(user: AuthUser, itemId: string, quantity: number): Promise<CartItemDto> {
    return this.http.request<CartItemDto>({
      method: 'PATCH',
      url: `${this.baseUrl()}/internal/cart/by-user/${user.id}/items/${itemId}`,
      body: { quantity },
      headers: this.headers(user),
    });
  }

  async removeItem(user: AuthUser, itemId: string): Promise<void> {
    await this.http.request<void>({
      method: 'DELETE',
      url: `${this.baseUrl()}/internal/cart/by-user/${user.id}/items/${itemId}`,
      headers: this.headers(user),
    });
  }

  async clearCart(user: AuthUser): Promise<void> {
    await this.http.request<void>({
      method: 'DELETE',
      url: `${this.baseUrl()}/internal/cart/by-user/${user.id}`,
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
