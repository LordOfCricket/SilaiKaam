import { apiClient } from '@/lib/api-client';
import type {
  CategoryDto,
  FittingServiceDto,
  ProductDetailDto,
  ProductListResultDto,
  ProductSort,
} from '@silaikaam/types';

export interface ProductQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  sort?: ProductSort;
  page?: number;
}

export const marketplaceApi = {
  listCategories: () => apiClient.get<CategoryDto[]>('/marketplace/categories'),
  listProducts: (query: ProductQuery) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return apiClient.get<ProductListResultDto>(`/marketplace/products${qs ? `?${qs}` : ''}`);
  },
  findBySlug: (slug: string) =>
    apiClient.get<ProductDetailDto>(`/marketplace/products/${encodeURIComponent(slug)}`),
  listFittingServices: (slug: string) =>
    apiClient.get<FittingServiceDto[]>(
      `/marketplace/products/${encodeURIComponent(slug)}/fitting-services`,
    ),
  listAllFittingServices: () => apiClient.get<FittingServiceDto[]>('/marketplace/fitting-services'),
};
