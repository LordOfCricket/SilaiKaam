import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CategoryDto,
  FittingServiceDto,
  ProductDetailDto,
  ProductListResultDto,
} from '@silaikaam/types';
import type { GatewayEnv } from '../../config/configuration';
import { DownstreamHttpService } from '../../common/http/downstream-http.service';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(DownstreamHttpService) private readonly http: DownstreamHttpService,
    @Inject(ConfigService) private readonly config: ConfigService<GatewayEnv, true>,
  ) {}

  listCategories(): Promise<CategoryDto[]> {
    return this.http.request<CategoryDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/catalog/categories`,
    });
  }

  listProducts(query: ProductQueryDto): Promise<ProductListResultDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    return this.http.request<ProductListResultDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/catalog/products?${params.toString()}`,
    });
  }

  findProductBySlug(slug: string): Promise<ProductDetailDto> {
    return this.http.request<ProductDetailDto>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/catalog/products/${encodeURIComponent(slug)}`,
    });
  }

  listFittingServicesForProduct(slug: string): Promise<FittingServiceDto[]> {
    return this.http.request<FittingServiceDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/catalog/products/${encodeURIComponent(slug)}/fitting-services`,
    });
  }

  listAllFittingServices(): Promise<FittingServiceDto[]> {
    return this.http.request<FittingServiceDto[]>({
      method: 'GET',
      url: `${this.baseUrl()}/internal/catalog/fitting-services`,
    });
  }

  private baseUrl(): string {
    return this.config.get('CATALOG_SERVICE_URL', { infer: true });
  }
}
