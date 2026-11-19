import { CheckCircle2Icon, CircleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    running: '正在处理，请勿关闭页面…',
    done: '已完成',
    failed: '{n} 项失败，失败的项目已保持选中',
  },
  en: {
    running: 'Working, keep this page open…',
    done: 'Done',
    failed: '{n} failed; failed items stay selected',
  },
})

export type BatchProgress = {
  title: string
  done: number
  total: number
  failed: number
  running: boolean
}

/** Progress modal for sequential bulk operations. Cannot be closed while running. */
export function BatchProgressDialog({
  progress,
  onOpenChange,
}: {
  progress: BatchProgress | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useT(messages)
  const percent = progress && progress.total ? Math.floor((progress.done / progress.total) * 100) : 0
  return (
    <Dialog open={!!progress} onOpenChange={(open) => !progress?.running && onOpenChange(open)}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!progress?.running}>
        <DialogHeader>
          <DialogTitle>{progress?.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {progress?.running ? (
              <>
                <Spinner />
                {t('running')}
              </>
            ) : progress?.failed ? (
              <>
                <CircleAlertIcon className="size-4 text-destructive" />
                {t('failed', { n: progress.failed })}
              </>
            ) : (
              <>
                <CheckCircle2Icon className="size-4 text-primary" />
                {t('done')}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Progress value={percent} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
            <span>
              {progress?.done ?? 0}/{progress?.total ?? 0}
            </span>
            <span>{percent}%</span>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={progress?.running} onClick={() => onOpenChange(false)}>
            {t('ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
