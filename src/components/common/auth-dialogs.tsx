import { useRef, useState } from 'react'
import { KeyRoundIcon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { PasswordInput } from './password-input'
import { Turnstile, type TurnstileHandle } from './turnstile'
import { api } from '@/lib/api'
import { hashPassword } from '@/lib/crypto'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { useAuth } from '@/store/auth'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    siteTitle: '访问密码',
    siteTip: '该站点已开启访问密码保护，请输入正确的访问密码。',
    adminTitle: '管理员密码',
    adminTip: '请输入管理员密码以访问管理后台。',
    passwordPlaceholder: '请输入密码',
  },
  en: {
    siteTitle: 'Access Password',
    siteTip: 'This site is password protected. Please enter the access password.',
    adminTitle: 'Admin Password',
    adminTip: 'Enter the admin password to access the admin console.',
    passwordPlaceholder: 'Enter password',
  },
})

function PasswordDialog({
  open,
  closable,
  onOpenChange,
  icon,
  title,
  description,
  submit,
}: {
  open: boolean
  closable: boolean
  onOpenChange: (open: boolean) => void
  icon: React.ReactNode
  title: string
  description: string
  submit: (password: string, cfToken: string) => Promise<void>
}) {
  const t = useT(messages)
  const [password, setPassword] = useState('')
  const [cfToken, setCfToken] = useState('')
  const [loading, setLoading] = useState(false)
  const turnstile = useRef<TurnstileHandle>(null)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    try {
      await submit(password, cfToken)
    } catch (error) {
      toast.error(errorMessage(error))
      turnstile.current?.refresh()
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => (closable || o) && onOpenChange(o)}>
      <DialogContent showCloseButton={closable} onInteractOutside={(e) => !closable && e.preventDefault()}>
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="dialog-password">{t('password')}</FieldLabel>
              <PasswordInput
                id="dialog-password"
                autoFocus
                value={password}
                placeholder={t('passwordPlaceholder')}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Turnstile ref={turnstile} onToken={setCfToken} />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={!password || loading} className="w-full sm:w-auto">
              {loading && <Spinner />}
              {t('ok')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Site access password (x-custom-auth). Cannot be dismissed — the whole site needs it. */
export function SiteAuthDialog() {
  const t = useT(messages)
  const open = useApp((s) => s.showSiteAuth)
  return (
    <PasswordDialog
      open={open}
      closable={false}
      onOpenChange={(o) => useApp.getState().set({ showSiteAuth: o })}
      icon={<KeyRoundIcon className="size-5" />}
      title={t('siteTitle')}
      description={t('siteTip')}
      submit={async (password, cfToken) => {
        await api.post('/open_api/site_login', { password: await hashPassword(password), cf_token: cfToken })
        useAuth.getState().setSiteAuth(password)
        location.reload()
      }}
    />
  )
}

/** Admin password (x-admin-auth). */
export function AdminAuthDialog({ onCancel }: { onCancel?: () => void }) {
  const t = useT(messages)
  const open = useApp((s) => s.showAdminAuth)
  return (
    <PasswordDialog
      open={open}
      closable
      onOpenChange={(o) => {
        useApp.getState().set({ showAdminAuth: o })
        if (!o) onCancel?.()
      }}
      icon={<ShieldCheckIcon className="size-5" />}
      title={t('adminTitle')}
      description={t('adminTip')}
      submit={async (password, cfToken) => {
        await api.post('/open_api/admin_login', { password: await hashPassword(password), cf_token: cfToken })
        useAuth.getState().setAdminAuth(password)
        location.reload()
      }}
    />
  )
}
