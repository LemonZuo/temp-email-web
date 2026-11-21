import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightLeftIcon, LogInIcon, MailPlusIcon, TicketIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddressLoginForm, CreateAddressForm, type NewAddressResponse } from '@/features/mailbox/components/address-forms'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'
import type { BoundAddress } from '../session'

const messages = defineMessages({
  zh: {
    addTitle: '添加邮箱',
    addDesc: '创建新邮箱地址或登录已有邮箱，都会自动绑定到当前用户。',
    addDescBindOnly: '登录已有邮箱后，它会自动绑定到当前用户。',
    createTab: '创建邮箱',
    bindTab: '绑定已有邮箱',
    bindUserAddressError: '绑定邮箱地址到用户时出错',
    redeemEntryTip: '使用兑换码可解锁高级权限',
    useRedeemCode: '使用兑换码',
    transferAddress: '转移邮箱',
    transferAddressTip:
      '转移地址到其他用户将会从你的账户中移除此地址并转移给其他用户。确定要转移地址吗？',
    targetUserEmail: '目标用户邮箱',
    targetUserEmailRequired: '请输入目标用户邮箱',
    transferSuccess: '邮箱已转移',
    bindSuccess: '邮箱已绑定到当前用户',
  },
  en: {
    addTitle: 'Add Mailbox',
    addDesc: 'Create a new address or sign in to an existing one; either way it is bound to your account.',
    addDescBindOnly: 'Sign in to an existing address to bind it to your account.',
    createTab: 'Create address',
    bindTab: 'Bind existing',
    bindUserAddressError: 'Failed to bind address to user',
    redeemEntryTip: 'Use a redemption code to unlock advanced access.',
    useRedeemCode: 'Use redemption code',
    transferAddress: 'Transfer Mailbox',
    transferAddressTip:
      'Transfer address to another user will remove the address from your account and transfer it to another user. Are you sure to transfer the address?',
    targetUserEmail: 'Target User Email',
    targetUserEmailRequired: 'Target user email is required',
    transferSuccess: 'Mailbox transferred',
    bindSuccess: 'Mailbox bound to your account',
  },
})

export type AddTab = 'create' | 'bind'

/**
 * Create a new address or log in to an existing one. Both switch the current mailbox to that
 * address (like the previous frontend) and bind it to the logged-in user.
 */
export function AddAddressDialog({
  tab,
  onTabChange,
  onClose,
  onCreated,
  onBound,
}: {
  /** `null` closes the dialog */
  tab: AddTab | null
  onTabChange: (tab: AddTab) => void
  onClose: () => void
  onCreated: (res: NewAddressResponse) => void
  onBound: () => void
}) {
  const t = useT(messages)
  const openSettings = useApp((s) => s.openSettings)
  const canCreate = openSettings.enableUserCreateEmail
  const active = canCreate ? tab || 'create' : 'bind'

  return (
    <Dialog open={!!tab} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addTitle')}</DialogTitle>
          <DialogDescription>{t(canCreate ? 'addDesc' : 'addDescBindOnly')}</DialogDescription>
        </DialogHeader>
        <Tabs value={active} onValueChange={(v) => onTabChange(v as AddTab)}>
          {canCreate && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <MailPlusIcon />
                {t('createTab')}
              </TabsTrigger>
              <TabsTrigger value="bind">
                <LogInIcon />
                {t('bindTab')}
              </TabsTrigger>
            </TabsList>
          )}
          {canCreate && (
            <TabsContent value="create" className="pt-3">
              <CreateAddressForm showCredential={false} afterCreated={(res) => onCreated(res)} />
            </TabsContent>
          )}
          <TabsContent value="bind" className="pt-3">
            <AddressLoginForm
              onSuccess={({ bound }) => {
                if (bound) toast.success(t('bindSuccess'))
                onBound()
              }}
            />
          </TabsContent>
        </Tabs>
        {openSettings.enableRedeemCode && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm text-muted-foreground">
            <span>{t('redeemEntryTip')}</span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/redeem">
                <TicketIcon />
                {t('useRedeemCode')}
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Moves a bound address to another user account (`/user_api/transfer_address`). */
export function TransferAddressDialog({
  address,
  onClose,
  onTransferred,
}: {
  address: BoundAddress | null
  onClose: () => void
  onTransferred: () => void
}) {
  const t = useT(messages)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const close = () => {
    setEmail('')
    onClose()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return
    const target = email.trim()
    if (!target) return toast.error(t('targetUserEmailRequired'))
    setLoading(true)
    try {
      await api.post('/user_api/transfer_address', { address_id: address.id, target_user_email: target })
      toast.success(t('transferSuccess'))
      setEmail('')
      onTransferred()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!address} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t('transferAddress')}</DialogTitle>
            <DialogDescription>{t('transferAddressTip')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm break-all">{address?.name}</div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="transfer-target-email">{t('targetUserEmail')}</FieldLabel>
              <Input
                id="transfer-target-email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={loading || !email.trim()}>
              {loading ? <Spinner /> : <ArrowRightLeftIcon />}
              {t('transferAddress')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
