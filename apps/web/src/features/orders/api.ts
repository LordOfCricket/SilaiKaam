import { apiClient } from '@/lib/api-client';
import type { OrderDetailDto, OrderSummaryDto, PlaceOrderResultDto } from '@silaikaam/types';

export interface PlaceOrderPayload {
  addressId: string;
  idempotencyKey: string;
}

export const ordersApi = {
  placeOrder: (payload: PlaceOrderPayload) =>
    apiClient.post<PlaceOrderResultDto>('/orders', payload),
  list: () => apiClient.get<OrderSummaryDto[]>('/orders'),
  get: (orderId: string) => apiClient.get<OrderDetailDto>(`/orders/${orderId}`),
};
