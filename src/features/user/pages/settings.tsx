import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser'
import { KeyRoundIcon, LogOutIcon, PencilIcon, PlusIcon, ShieldCheckIcon, ShieldIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { confirm } from '@/components/common/confirm'
import { CopyButton } from '@/components/common/copy-button'
import { EmptyState } from '@/components/common/empty-state'
import { Page, PageHeader, Section } from '@/components/common/page'
import { SenderAvatar } from '@/components/mail/mail-list'
import { api } from '@/lib/api'
import { errorMessage, formatDateTime } from '@/lib/format'
import { adminPath } from '@/features/admin/paths'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import { logoutUser } from '../session'

const messages = defineMessages({
  zh: {
    title: '账户设置',
    description: '查看账户信息，管理 Passkey 与登录状态。',
    account: '账户信息',
    userId: '用户 ID',
    role: '角色',
    noRole: '默认用户',
    admin: '管理员',
    openAdmin: '进入管理后台',
    passkeys: 'Passkey',
    passkeysDesc: '使用设备的指纹、面容或安全密钥免密码登录。',
    createPasskey: '创建 Passkey',
    passkeyCreated: 'Passkey 创建成功',
    passkey_name: 'Passkey 名称',
    passkeyNamePlaceholder: '请输入 Passkey 名称或者留空自动生成',
    renamePasskey: '重命名 Passkey',
    renamePasskeyNamePlaceholder: '请输入新的 Passkey 名称',
    renamed: '已重命名',
    deletePasskey: '删除 Passkey',
    deleteConfirm: '确定删除 Passkey「{name}」吗？',
    deleteDesc: '删除后将无法再使用此 Passkey 登录。',
    deleted: 'Passkey 已删除',
    noPasskeys: '还没有 Passkey',
    noPasskeysDesc: '创建后即可在登录页使用 Passkey 一键登录。',
    unsupported: '当前浏览器不支持 Passkey',
    nameRequired: '请输入 Passkey 名称',
    security: '密码安全',
    passordTip:
      '服务器只会接收到密码的哈希值，不会接收到明文密码，因此无法查看或者找回您的密码, 如果管理员启用了邮件验证您可以在无痕模式重置密码',
    logoutDesc: '退出后需要重新登录才能访问用户中心，已绑定的邮箱不会受影响。',
    logoutConfirm: '确定要退出登录吗？',
  },
  en: {
    title: 'Account settings',
    description: 'Account information, passkeys and sign-in state.',
    account: 'Account',
    userId: 'User ID',
    role: 'Role',
    noRole: 'Default user',
    admin: 'Admin',
    openAdmin: 'Open admin console',
    passkeys: 'Passkeys',
    passkeysDesc: 'Sign in without a password using your device biometrics or a security key.',
    createPasskey: 'Create Passkey',
    passkeyCreated: 'Passkey created successfully',
    passkey_name: 'Passkey Name',
    passkeyNamePlaceholder: 'Please enter the passkey name or leave it empty to generate a random one',
    renamePasskey: 'Rename Passkey',
    renamePasskeyNamePlaceholder: 'Please enter the new passkey name',
    renamed: 'Passkey renamed',
    deletePasskey: 'Delete Passkey',
    deleteConfirm: 'Delete passkey “{name}”?',
    deleteDesc: 'You will no longer be able to sign in with this passkey.',
    deleted: 'Passkey deleted',
    noPasskeys: 'No passkeys yet',
    noPasskeysDesc: 'Once created you can sign in with one tap on the login page.',
    unsupported: 'This browser does not support passkeys',
    nameRequired: 'Please enter the passkey name',
    security: 'Password security',
    passordTip:
      'The server will only receive the hash value of the password, and will not receive the plaintext password, so it cannot view or retrieve your password. If the administrator enables email verification, you can reset the password in incognito mode',
    logoutDesc: 'You will need to sign in again to use the user center. Your bound addresses are not affected.',
    logoutConfirm: 'Are you sure you want to logout?',
  },
})

type Passkey = { passkey_id: string; passkey_name: string; created_at: string; updated_at: string }

const PASSKEYS_KEY = ['user', 'passkeys']

const defaultPasskeyName = () => {
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
  return `${platform || 'Unknown'}: ${Math.random().toString(36).substring(7)}`
}

function CreatePasskeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const t = useT(messages)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const options = await api.post<PublicKeyCredentialCreationOptionsJSON>('/user_api/passkey/register_request', {
        domain: window.location.hostname,
      })
      const credential = await startRegistration({ optionsJSON: options })
      await api.post('/user_api/passkey/register_response', {
        origin: window.location.origin,
        passkey_name: name.trim() || defaultPasskeyName(),
        credential,
      })
      toast.success(t('passkeyCreated'))
      setName('')
      onOpenChange(false)
      onCreated()
    } catch (error) {
      console.error(error)
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t('createPasskey')}</DialogTitle>
            <DialogDescription>{t('passkeysDesc')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="passkey-name">{t('passkey_name')}</FieldLabel>
              <Input id="passkey-name" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
              <FieldDescription>{t('passkeyNamePlaceholder')}</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <KeyRoundIcon />}
              {t('createPasskey')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RenamePasskeyForm({ passkey, onClose, onRenamed }: { passkey: Passkey; onClose: () => void; onRenamed: () => void }) {
  const t = useT(messages)
  const [name, setName] = useState(passkey.passkey_name || '')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = name.trim()
    if (!value) return toast.error(t('nameRequired'))
    setLoading(true)
    try {
      await api.post('/user_api/passkey/rename', { passkey_name: value, passkey_id: passkey.passkey_id })
      toast.success(t('renamed'))
      onClose()
      onRenamed()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{t('renamePasskey')}</DialogTitle>
        <DialogDescription className="font-mono text-xs break-all">{passkey.passkey_id}</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="passkey-rename">{t('passkey_name')}</FieldLabel>
        <Input
          id="passkey-rename"
          value={name}
          maxLength={255}
          placeholder={t('renamePasskeyNamePlaceholder')}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? <Spinner /> : <PencilIcon />}
          {t('renamePasskey')}
        </Button>
      </DialogFooter>
    </form>
  )
}

function RenamePasskeyDialog({ passkey, onClose, onRenamed }: { passkey: Passkey | null; onClose: () => void; onRenamed: () => void }) {
  return (
    <Dialog open={!!passkey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {passkey && <RenamePasskeyForm key={passkey.passkey_id} passkey={passkey} onClose={onClose} onRenamed={onRenamed} />}
      </DialogContent>
    </Dialog>
  )
}

function PasskeysSection() {
  const t = useT(messages)
  const [createOpen, setCreateOpen] = useState(false)
  const [renaming, setRenaming] = useState<Passkey | null>(null)
  const supported = browserSupportsWebAuthn()

  const passkeys = useQuery({
    queryKey: PASSKEYS_KEY,
    queryFn: () => api.get<Passkey[]>('/user_api/passkey'),
  })
  useEffect(() => {
    if (passkeys.error) toast.error(errorMessage(passkeys.error))
  }, [passkeys.error])

  const remove = async (passkey: Passkey) => {
    const ok = await confirm({
      title: t('deleteConfirm', { name: passkey.passkey_name }),
      description: t('deleteDesc'),
      confirmText: t('delete'),
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/user_api/passkey/${encodeURIComponent(passkey.passkey_id)}`)
      toast.success(t('deleted'))
      void passkeys.refetch()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const createButton = (
    <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!supported}>
      <PlusIcon />
      {t('createPasskey')}
    </Button>
  )
  const rows = passkeys.data || []

  return (
    <Section
      title={t('passkeys')}
      description={t('passkeysDesc')}
      actions={
        supported ? (
          createButton
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{createButton}</span>
            </TooltipTrigger>
            <TooltipContent>{t('unsupported')}</TooltipContent>
          </Tooltip>
        )
      }
    >
      {passkeys.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState className="py-6" icon={<KeyRoundIcon />} title={t('noPasskeys')} description={t('noPasskeysDesc')} />
      ) : (
        <ItemGroup className="gap-2">
          {rows.map((passkey) => (
            <Item key={passkey.passkey_id} variant="outline">
              <ItemMedia variant="icon">
                <KeyRoundIcon />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="max-w-full truncate">{passkey.passkey_name}</ItemTitle>
                <ItemDescription className="truncate">
                  {t('createdAt')} {formatDateTime(passkey.created_at)}
                  {passkey.updated_at && passkey.updated_at !== passkey.created_at
                    ? ` · ${t('updatedAt')} ${formatDateTime(passkey.updated_at)}`
                    : ''}
                </ItemDescription>
                <div className="truncate font-mono text-[11px] text-muted-foreground" title={passkey.passkey_id}>
                  ID: {passkey.passkey_id}
                </div>
              </ItemContent>
              <ItemActions>
                <Button variant="ghost" size="icon-sm" aria-label={t('renamePasskey')} onClick={() => setRenaming(passkey)}>
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={t('deletePasskey')}
                  onClick={() => remove(passkey)}
                >
                  <Trash2Icon />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      )}
      <CreatePasskeyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void passkeys.refetch()} />
      <RenamePasskeyDialog passkey={renaming} onClose={() => setRenaming(null)} onRenamed={() => void passkeys.refetch()} />
    </Section>
  )
}

/** `/user/settings` — account info, passkeys, logout. */
export default function SettingsPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const { user_email, user_id, is_admin, user_role } = useApp((s) => s.userSettings)

  const logout = async () => {
    if (!(await confirm({ title: t('logoutConfirm'), confirmText: t('logout') }))) return
    logoutUser()
    navigate('/user')
  }

  return (
    <Page>
      <PageHeader title={t('title')} description={t('description')} />

      <Section>
        <div className="flex flex-wrap items-center gap-4">
          <SenderAvatar name={user_email} className="size-12 rounded-xl text-base" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{t('account')}</div>
            <div className="flex items-center gap-1">
              <span className="truncate text-lg font-semibold">{user_email}</span>
              <CopyButton value={user_email} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t('userId')} <span className="font-mono text-foreground">{user_id}</span>
              </span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                {t('role')}
                <Badge variant={user_role?.role ? 'secondary' : 'outline'}>{user_role?.role || t('noRole')}</Badge>
              </span>
              {is_admin && (
                <Badge className="gap-1">
                  <ShieldCheckIcon className="size-3" />
                  {t('admin')}
                </Badge>
              )}
            </div>
          </div>
          {is_admin && (
            <Button variant="outline" size="sm" onClick={() => navigate(adminPath())}>
              <ShieldIcon />
              {t('openAdmin')}
            </Button>
          )}
        </div>
      </Section>

      <PasskeysSection />

      <Section title={t('security')}>
        <Alert>
          <ShieldCheckIcon />
          <AlertDescription>{t('passordTip')}</AlertDescription>
        </Alert>
      </Section>

      <Item variant="outline">
        <ItemMedia variant="icon">
          <LogOutIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{t('logout')}</ItemTitle>
          <ItemDescription>{t('logoutDesc')}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm" onClick={logout}>
            {t('logout')}
          </Button>
        </ItemActions>
      </Item>
    </Page>
  )
}
