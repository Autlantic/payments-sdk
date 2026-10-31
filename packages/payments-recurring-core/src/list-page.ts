import type { BillingListPage, BillingListParams } from "./types";

export const BILLING_LIST_DEFAULT_LIMIT = 50;
export const BILLING_LIST_MAX_LIMIT = 100;

export function normalizeBillingListLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) return BILLING_LIST_DEFAULT_LIMIT;
  return Math.min(BILLING_LIST_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

/**
 * Slice a newest-first (or any ordered) id-sortable list into a cursor page.
 * `startingAfter` skips through the row with that id, then takes `limit`.
 */
export function paginateById<T extends { id: string }>(
  rows: T[],
  params?: BillingListParams,
): BillingListPage<T> {
  const limit = normalizeBillingListLimit(params?.limit);
  const cursor = params?.startingAfter?.trim() || null;
  let start = 0;
  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const slice = rows.slice(start, start + limit + 1);
  const hasMore = slice.length > limit;
  const data = hasMore ? slice.slice(0, limit) : slice;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;
  return { data, hasMore, nextCursor };
}
