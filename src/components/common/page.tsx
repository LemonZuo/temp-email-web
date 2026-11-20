import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Standard scrollable page used inside the app shell for non-mail screens
 * (settings, admin tables...). Mail screens use the three-pane workspace instead.
 * `wide` pages (tables, charts) fill the content area; others stay a centered readable column.
 */
export function Page({ className, children, wide }: { className?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className={cn('mx-auto flex w-full flex-col gap-6 p-4 md:p-6', !wide && 'max-w-4xl', className)}>
        {children}
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A titled card section, the building block of settings pages. */
export function Section({
  title,
  description,
  actions,
  footer,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      {children !== undefined && <CardContent className={contentClassName}>{children}</CardContent>}
      {footer && <CardFooter className="justify-end gap-2 border-t">{footer}</CardFooter>}
    </Card>
  )
}
