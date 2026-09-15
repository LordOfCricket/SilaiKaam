import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser, WishlistItemDto } from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';

@Injectable()
export class WishlistService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  list(user: AuthUser): Promise<WishlistItemDto[]> {
    return this.http.request<WishlistItemDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/wishlist`,
      headers: this.headers(user),
    });
  }

  add(user: AuthUser, productId: string): Promise<WishlistItemDto> {
    return this.http.request<WishlistItemDto>({
      method: 'POST',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/wishlist/items`,
      body: { productId },
      headers: this.headers(user),
    });
  }

  async remove(user: AuthUser, productId: string): Promise<void> {
    await this.http.request<void>({
      method: 'DELETE',
      url: `${this.baseUrl()}/internal/customers/by-user/${user.id}/wishlist/items/${productId}`,
      headers: this.headers(user),
    });
  }

  private baseUrl(): string {
    return this.config.get('USER_SERVICE_URL', { infer: true });
  }

  private headers(user: AuthUser): Record<string, string> {
    return { 'x-user-id': user.id, 'x-user-role': user.role };
  }
}
