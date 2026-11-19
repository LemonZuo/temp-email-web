import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, InboxIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/common/empty-state'
import { cn } from '@/lib/utils'
import { nextSort, type SortState } from './helpers'

/** Header cell with a sort toggle. */
export function SortableHead<K extends string>({
  column,
  sort,
  onSort,
  children,
  className,
}: {
  column: K
  sort: SortState<K>
  onSort: (next: SortState<K>) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sort.by === column && !!sort.order
  const Icon = !active ? ArrowUpDownIcon : sort.order === 'ascend' ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead
      className={className}
      aria-sort={!active ? 'none' : sort.order === 'ascend' ? 'ascending' : 'descending'}
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column))}
        className={cn(
          '-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {children}
        <Icon className={cn('size-3.5', !active && 'opacity-40')} />
      </button>
    </TableHead>
  )
}

/** Skeleton rows while the first page loads. */
export function TableLoadingRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className={cn('h-4', j === 0 ? 'w-8' : 'w-full max-w-40')} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/** Full-width empty row. */
export function TableEmptyRow({
  columns,
  title,
  description,
  icon,
}: {
  columns: number
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="p-0">
        <EmptyState className="py-12" icon={icon ?? <InboxIcon />} title={title} description={description} />
      </TableCell>
    </TableRow>
  )
}

/** Small count pill; clickable when `onClick` is given and the count is positive. */
export function CountBadge({ count, onClick, label }: { count: number; onClick?: () => void; label?: string }) {
  const value = count > 99 ? '99+' : String(count ?? 0)
  if (!onClick || !count) {
    return (
      <Badge variant={count ? 'secondary' : 'outline'} className="tabular-nums">
        {value}
      </Badge>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label ? `${label} (${count})` : undefined}
      className="group inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-primary"
    >
      <Badge className="bg-primary/10 text-primary tabular-nums group-hover:bg-primary/15">{value}</Badge>
      {label && <span className="hidden underline-offset-4 group-hover:underline lg:inline">{label}</span>}
    </button>
  )
}
