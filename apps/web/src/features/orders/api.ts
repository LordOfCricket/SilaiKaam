import { apiClient } from '@/lib/api-client';
import type {
  CancelOrderResultDto,
  CancellationReason,
  DisputeDto,
  DisputeType,
  OrderDetailDto,
  OrderSummaryDto,
  PlaceOrderResultDto,
  ReorderResultDto,
  RespondActionRequestResultDto,
  ReviewDto,
  ReviewTargetType,
} from '@silaikaam/types';

export interface PlaceOrderPayload {
  addressId: string;
  idempotencyKey: string;
}

export interface CreateReviewPayload {
  orderItemId: string;
  targetType: ReviewTargetType;
  rating: number;
  title?: string;
  comment?: string;
}

export interface CreateDisputePayload {
  type: DisputeType;
  orderItemId?: string;
  description: string;
}

export const ordersApi = {
  placeOrder: (payload: PlaceOrderPayload) =>
    apiClient.post<PlaceOrderResultDto>('/orders', payload),
  list: () => apiClient.get<OrderSummaryDto[]>('/orders'),
  get: (orderId: string) => apiClient.get<OrderDetailDto>(`/orders/${orderId}`),
  respondToActionRequest: (orderId: string, actionRequestId: string, responseText: string) =>
    apiClient.post<RespondActionRequestResultDto>(
      `/orders/${orderId}/action-requests/${actionRequestId}/respond`,
      { responseText },
    ),
  createReview: (orderId: string, payload: CreateReviewPayload) =>
    apiClient.post<ReviewDto>(`/orders/${orderId}/reviews`, payload),
  updateReview: (orderId: string, reviewId: string, payload: Partial<CreateReviewPayload>) =>
    apiClient.patch<ReviewDto>(`/orders/${orderId}/reviews/${reviewId}`, payload),
  reorder: (orderId: string, itemId: string) =>
    apiClient.post<ReorderResultDto>(`/orders/${orderId}/items/${itemId}/reorder`),
  cancel: (orderId: string, reason: CancellationReason, note?: string) =>
    apiClient.post<CancelOrderResultDto>(`/orders/${orderId}/cancel`, { reason, note }),
  createDispute: (orderId: string, payload: CreateDisputePayload) =>
    apiClient.post<DisputeDto>(`/orders/${orderId}/disputes`, payload),
};
