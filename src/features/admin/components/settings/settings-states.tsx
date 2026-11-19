import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { errorMessage } from '@/lib/format'
import { useT } from '@/i18n'
import { settingsMessages } from './messages'

/** Placeholder cards shown while a settings page loads. */
export function SettingsSkeleton({ sections = 2, rows = 3 }: { sections?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: sections }, (_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-5">
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  )
}

/** Shown in place of the form when the initial load failed. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT(settingsMessages)
  return (
    <EmptyState icon={<TriangleAlertIcon />} title={t('loadFailed')} description={errorMessage(error)}>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCwIcon />
        {t('retry')}
      </Button>
    </EmptyState>
  )
}
