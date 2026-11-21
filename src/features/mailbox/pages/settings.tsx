import { useState } from 'react'
import { useNavigate } from 'react-router'
import { EraserIcon, KeyRoundIcon, LockIcon, LogOutIcon, MailXIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Spinner } from '@/components/ui/spinner'
import { Page, PageHeader, Section } from '@/components/common/page'
import { PasswordInput } from '@/components/common/password-input'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { api } from '@/lib/api'
import { hashPassword } from '@/lib/crypto'
import { errorMessage } from '@/lib/format'
import { queryClient } from '@/lib/query-client'
import { leaveAddress } from '@/lib/session'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    title: '账户与安全',
    description: '管理当前邮箱的凭证、密码和数据。',
    account: '当前邮箱',
    sendBalance: '剩余发信额度',
    credential: '地址凭证与连接方式',
    credentialDesc: '查看凭证、自动登录链接、SMTP/IMAP 和 AI Agent 接入信息。',
    sessionToken: '查看当前会话 Token',
    view: '查看',
    changePassword: '修改邮箱密码',
    changePasswordDesc: '设置后可使用「邮箱地址 + 密码」登录。',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    passwordMismatch: '两次输入的密码不一致',
    passwordChanged: '密码修改成功',
    data: '邮件数据',
    clearInbox: '清空收件箱',
    clearInboxDesc: '删除收件箱中的全部邮件。',
    clearInboxConfirm: '确定要清空收件箱中的所有邮件吗？',
    clearSent: '清空发件箱',
    clearSentDesc: '删除发件箱中的全部邮件。',
    clearSentConfirm: '确定要清空发件箱中的所有邮件吗？',
    clear: '清空',
    session: '会话',
    logoutMailbox: '退出邮箱登录',
    logoutMailboxDesc: '凭证仍保存在本地邮箱列表中，可随时切换回来。',
    logoutConfirm: '确定要退出当前邮箱地址的登录吗？',
    danger: '危险操作',
    deleteMailbox: '删除邮箱',
    deleteMailboxDesc: '删除当前邮箱地址及其所有邮件，不会删除你的用户账号。',
    deleteConfirm: '确定要删除当前邮箱地址及其中的所有邮件吗？',
  },
  en: {
    title: 'Account & security',
    description: 'Manage the credential, password and data of this mailbox.',
    account: 'Current mailbox',
    sendBalance: 'Send balance',
    credential: 'Credential & connection',
    credentialDesc: 'Credential, auto-login link, SMTP/IMAP and AI agent access.',
    sessionToken: 'View session token',
    view: 'View',
    changePassword: 'Change mailbox password',
    changePasswordDesc: 'Lets you sign in with address + password.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    passwordMismatch: 'Passwords do not match',
    passwordChanged: 'Password changed',
    data: 'Mail data',
    clearInbox: 'Clear inbox',
    clearInboxDesc: 'Delete every mail in the inbox.',
    clearInboxConfirm: 'Clear all mails in your inbox?',
    clearSent: 'Clear sent items',
    clearSentDesc: 'Delete every mail in the sent box.',
    clearSentConfirm: 'Clear all mails in your sent items?',
    clear: 'Clear',
    session: 'Session',
    logoutMailbox: 'Log out of mailbox',
    logoutMailboxDesc: 'The credential stays in your local mailbox list so you can switch back.',
    logoutConfirm: 'Log out of the current address?',
    danger: 'Danger zone',
    deleteMailbox: 'Delete mailbox',
    deleteMailboxDesc: 'Deletes this address and all of its mails. Your user account is not affected.',
    deleteConfirm: 'Delete this address and all of its mails?',
  },
})

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT(messages)
  const [password, setPassword] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmValue) return toast.error(t('passwordMismatch'))
    setSaving(true)
    try {
      await api.post('/api/address_change_password', { new_password: await hashPassword(password) })
      toast.success(t('passwordChanged'))
      setPassword('')
      setConfirmValue('')
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>{t('changePasswordDesc')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-password">{t('newPassword')}</FieldLabel>
              <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">{t('confirmPassword')}</FieldLabel>
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!password || saving}>
              {saving && <Spinner />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActionItem({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <Item variant="outline">
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>{action}</ItemActions>
    </Item>
  )
}

/** `/settings` — credential, password, clear data, logout, delete mailbox. */
export default function AddressSettingsPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const { address, send_balance } = useApp((s) => s.addressSettings)
  const openSettings = useApp((s) => s.openSettings)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const run = async (title: string, path: string, destructive = true) => {
    if (!(await confirm({ title, description: t('irreversible'), destructive, confirmText: t('clear') }))) return
    try {
      await api.delete(path)
      toast.success(t('cleared'))
      queryClient.invalidateQueries({ queryKey: ['mailbox'] })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const logout = async () => {
    if (!(await confirm({ title: t('logoutConfirm'), confirmText: t('logoutMailbox') }))) return
    leaveAddress()
    navigate('/')
  }

  const deleteMailbox = async () => {
    if (!(await confirm({ title: t('deleteConfirm'), description: address, destructive: true, confirmText: t('deleteMailbox') }))) return
    try {
      await api.delete('/api/delete_address')
      const { jwt, localAddressCache, setLocalAddressCache } = useAuth.getState()
      setLocalAddressCache(localAddressCache.filter((x) => x !== jwt))
      leaveAddress()
      toast.success(t('deleted'))
      navigate('/')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Page>
      <PageHeader title={t('title')} description={t('description')} />

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{t('account')}</div>
            <div className="flex items-center gap-1">
              <span className="truncate font-mono text-lg font-semibold">{address}</span>
              <CopyButton value={address} />
            </div>
          </div>
          {openSettings.enableSendMail && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <SendIcon className="size-4 text-muted-foreground" />
              {t('sendBalance')}
              <span className="font-semibold tabular-nums">{send_balance}</span>
            </div>
          )}
        </div>
      </Section>

      <ItemGroup className="gap-3">
        <ActionItem
          icon={<KeyRoundIcon />}
          title={openSettings.addressPasswordLoginOnly ? t('sessionToken') : t('credential')}
          description={t('credentialDesc')}
          action={
            <Button variant="outline" size="sm" onClick={() => useApp.getState().set({ showCredential: true })}>
              {t('view')}
            </Button>
          }
        />
        {openSettings.enableAddressPassword && (
          <ActionItem
            icon={<LockIcon />}
            title={t('changePassword')}
            description={t('changePasswordDesc')}
            action={
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                {t('edit')}
              </Button>
            }
          />
        )}
        <ActionItem
          icon={<LogOutIcon />}
          title={t('logoutMailbox')}
          description={t('logoutMailboxDesc')}
          action={
            <Button variant="outline" size="sm" onClick={logout}>
              {t('logout')}
            </Button>
          }
        />
      </ItemGroup>

      {openSettings.enableUserDeleteEmail && (
        <div className="grid gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t('data')}</h2>
          <ItemGroup className="gap-3">
            <ActionItem
              icon={<EraserIcon />}
              title={t('clearInbox')}
              description={t('clearInboxDesc')}
              action={
                <Button variant="outline" size="sm" onClick={() => run(t('clearInboxConfirm'), '/api/clear_inbox')}>
                  {t('clear')}
                </Button>
              }
            />
            <ActionItem
              icon={<MailXIcon />}
              title={t('clearSent')}
              description={t('clearSentDesc')}
              action={
                <Button variant="outline" size="sm" onClick={() => run(t('clearSentConfirm'), '/api/clear_sent_items')}>
                  {t('clear')}
                </Button>
              }
            />
          </ItemGroup>
          <h2 className="mt-3 text-sm font-medium text-destructive">{t('danger')}</h2>
          <Item variant="outline" className="border-destructive/40 bg-destructive/5">
            <ItemMedia variant="icon" className="text-destructive">
              <Trash2Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{t('deleteMailbox')}</ItemTitle>
              <ItemDescription>{t('deleteMailboxDesc')}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="destructive" size="sm" onClick={deleteMailbox}>
                {t('delete')}
              </Button>
            </ItemActions>
          </Item>
        </div>
      )}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </Page>
  )
}
