import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { InboxIcon, LinkIcon, MailIcon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { errorMessage, formatDateTime } from '@/lib/format'
import { adminPath } from '@/features/admin/paths'
import { CountBadge, TableEmptyRow, TableLoadingRows } from './data-table'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '邮箱管理',
    emailAddress: '邮箱地址',
    mail_count: '邮件数量',
    send_count: '发送数量',
    bindAddress: '绑定地址',
    bindPlaceholder: '输入已存在的邮箱地址并绑定到此用户',
    bindSuccess: '已绑定',
    empty: '该用户还没有绑定邮箱地址',
    viewMails: '查看邮件',
    viewSendBox: '查看发件箱',
  },
  en: {
    title: 'Mailbox Management',
    emailAddress: 'Email Address',
    mail_count: 'Mail Count',
    send_count: 'Send Count',
    bindAddress: 'Bind address',
    bindPlaceholder: 'Existing email address to bind to this user',
    bindSuccess: 'Address bound',
    empty: 'This user has no bound addresses yet',
    viewMails: 'View Mails',
    viewSendBox: 'View SendBox',
  },
})

type BoundAddress = {
  id: number
  name: string
  mail_count: number
  send_count: number
  created_at: string
  updated_at: string
}

export type AdminUserRef = { id: number; user_email: string }

/** Addresses bound to a user (`/admin/users/bind_address/:id`) + bind an existing address. */
export function UserAddressesDialog({
  user,
  onOpenChange,
  onChanged,
}: {
  user: AdminUserRef | null
  onOpenChange: (open: boolean) => void
  /** Called after a successful bind (address counts changed) */
  onChanged?: () => void
}) {
  const t = useT(messages)
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [binding, setBinding] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'users', 'bind_address', user?.id],
    queryFn: () => api.get<{ results: BoundAddress[] }>(`/admin/users/bind_address/${user?.id ?? 0}`),
    enabled: !!user,
  })
  const rows = query.data?.results || []

  const bind = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = address.trim()
    if (!user || !value) return
    setBinding(true)
    try {
      await api.post('/admin/users/bind_address', { user_id: user.id, address: value })
      toast.success(t('bindSuccess'))
      setAddress('')
      await query.refetch()
      onChanged?.()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBinding(false)
    }
  }

  const go = (path: 'mails' | 'sendbox', name: string) => {
    onOpenChange(false)
    navigate(`${adminPath(path)}?address=${encodeURIComponent(name)}`)
  }

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open) setAddress('')
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="break-all">{user?.user_email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={bind}>
          <InputGroup>
            <InputGroupAddon>
              <LinkIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('bindPlaceholder')}
              aria-label={t('bindAddress')}
              type="email"
              autoComplete="off"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" variant="secondary" disabled={binding || !address.trim()}>
                {binding && <Spinner />}
                {t('bindAddress')}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        {query.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage(query.error)}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table className="table-sticky-end min-w-[520px]">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t('emailAddress')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead>{t('mail_count')}</TableHead>
                  <TableHead>{t('send_count')}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableLoadingRows rows={3} columns={5} />
                ) : rows.length === 0 ? (
                  <TableEmptyRow columns={5} icon={<MailIcon />} title={t('empty')} />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-[13px] break-all">{row.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell>
                        <CountBadge count={row.mail_count} />
                      </TableCell>
                      <TableCell>
                        <CountBadge count={row.send_count} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => go('mails', row.name)} aria-label={t('viewMails')}>
                                <InboxIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('viewMails')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => go('sendbox', row.name)} aria-label={t('viewSendBox')}>
                                <SendIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('viewSendBox')}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
