import { useCallback, useEffect, useState } from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import type { ListResponse } from '@/lib/api'

/** Stable fallback so `items` keeps its identity while there is no data (effects depend on it). */
const EMPTY: never[] = []

/**
 * Offset pagination over the worker's list endpoints.
 *
 * NOTE: the worker only computes `count` when `offset == 0`; later pages return `count: 0`.
 * This hook remembers the total from the first page so the pager keeps working.
 * The worker rejects `limit > 100`.
 */
export function usePagedQuery<Raw, Item = Raw>({
  queryKey,
  fetchPage,
  transform,
  initialPageSize = 20,
  enabled = true,
}: {
  /** Base key; page/pageSize are appended. Include every filter that changes the result. */
  queryKey: QueryKey
  fetchPage: (limit: number, offset: number) => Promise<ListResponse<Raw>>
  /** Optional async mapping of rows (e.g. mail parsing) */
  transform?: (rows: Raw[]) => Item[] | Promise<Item[]>
  initialPageSize?: number
  enabled?: boolean
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [total, setTotal] = useState(0)
  const keyString = JSON.stringify(queryKey)

  // Filters changed -> back to first page
  useEffect(() => {
    setPage(1)
  }, [keyString])

  const query = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: async () => {
      const res = await fetchPage(pageSize, (page - 1) * pageSize)
      const rows = res?.results || []
      const items = transform ? await transform(rows) : (rows as unknown as Item[])
      return { items, count: res?.count || 0, page }
    },
    // Keep the previous page on screen while paging, but never show another list's rows
    // (different filters / mailbox) as a placeholder.
    placeholderData: (previous, previousQuery) =>
      previousQuery && JSON.stringify(previousQuery.queryKey.slice(0, -2)) === keyString ? previous : undefined,
    enabled,
  })

  useEffect(() => {
    if (!query.data) return
    if (query.data.page === 1) setTotal(query.data.count)
    else if (query.data.count > 0) setTotal(query.data.count)
  }, [query.data])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setPage(1)
  }, [])

  return {
    items: (query.data?.items ?? EMPTY) as Item[],
    total: Math.max(total, query.data?.items.length || 0),
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    query,
  }
}
