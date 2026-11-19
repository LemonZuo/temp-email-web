import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizes?: number[]
  className?: string
  /** compact: only arrows + "1-20 / 135" */
  compact?: boolean
}

/** 1-based pagination control. */
export function DataPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
  className,
  compact,
}: Props) {
  const t = useT()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className={cn('flex items-center justify-between gap-2 text-sm text-muted-foreground', className)}>
      {compact ? (
        <span className="tabular-nums">
          {from}-{to} / {total}
        </span>
      ) : (
        <div className="flex items-center gap-3">
          <span>{t('total', { n: total })}</span>
          {onPageSizeChange && (
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger size="sm" className="w-[84px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        {!compact && <span className="mr-2 tabular-nums">{t('pageOf', { page, pages })}</span>}
        <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t('prev')}>
          <ChevronLeftIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label={t('next')}>
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
