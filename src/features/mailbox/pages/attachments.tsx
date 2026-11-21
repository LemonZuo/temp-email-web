import { useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, CloudIcon, CloudOffIcon, DownloadIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Page, PageHeader } from '@/components/common/page'
import { EmptyState } from '@/components/common/empty-state'
import { confirm } from '@/components/common/confirm'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: 'S3 附件',
    description: '从邮件中保存到 S3 的附件。在邮件阅读页点击附件旁的上传按钮即可保存。',
    key: '文件',
    empty: '还没有保存任何附件',
    deleteConfirm: '确定要删除此附件吗？',
    disabledTitle: '未启用 S3 附件',
    disabledDesc: '站点没有配置 S3 存储，暂时无法保存附件。',
    loadFailed: '附件列表加载失败',
    retry: '重试',
  },
  en: {
    title: 'S3 attachments',
    description: 'Attachments saved to S3 from your mails. Use the upload button next to an attachment in the reader.',
    key: 'File',
    empty: 'No attachments saved yet',
    deleteConfirm: 'Delete this attachment?',
    disabledTitle: 'S3 attachments are off',
    disabledDesc: 'This site has no S3 storage configured, so attachments cannot be saved.',
    loadFailed: 'Could not load attachments',
    retry: 'Retry',
  },
})

/** `/attachments` — S3 attachments of the current address. */
export default function AttachmentsPage() {
  const t = useT(messages)
  const address = useApp((s) => s.addressSettings.address)
  // the nav hides this page without S3, but a direct link still lands here: say so instead of requesting (500)
  const s3Enabled = useApp((s) => s.openSettings.isS3Enabled)
  const query = useQuery({
    enabled: s3Enabled,
    queryKey: ['mailbox', address, 'attachments'],
    queryFn: async () => (await api.get<{ results?: { key: string }[] }>('/api/attachment/list')).results || [],
  })

  const download = async (key: string) => {
    try {
      const { url } = await api.post<{ url: string }>('/api/attachment/get_url', { key })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const remove = async (key: string) => {
    if (!(await confirm({ title: t('deleteConfirm'), description: key, destructive: true, confirmText: t('delete') }))) return
    try {
      await api.post('/api/attachment/delete', { key })
      toast.success(t('deleted'))
      await query.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const rows = query.data || []
  return (
    <Page>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          s3Enabled && (
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCwIcon className={cn(query.isFetching && 'animate-spin')} />
              {t('refresh')}
            </Button>
          )
        }
      />
      {!s3Enabled ? (
        <EmptyState icon={<CloudOffIcon />} title={t('disabledTitle')} description={t('disabledDesc')} className="rounded-xl border" />
      ) : query.isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : query.isError ? (
        <EmptyState icon={<CircleAlertIcon />} title={t('loadFailed')} description={errorMessage(query.error)} className="rounded-xl border">
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCwIcon />
            {t('retry')}
          </Button>
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState icon={<CloudIcon />} title={t('empty')} className="rounded-xl border" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('key')}</TableHead>
                <TableHead className="w-32 text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="max-w-0 truncate font-mono text-xs" title={row.key}>
                    {row.key}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => download(row.key)} aria-label={t('download')}>
                      <DownloadIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(row.key)} aria-label={t('delete')}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}
