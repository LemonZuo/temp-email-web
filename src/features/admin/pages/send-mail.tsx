import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShieldCheckIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ComposeForm } from '@/components/compose/compose-form'
import { api } from '@/lib/api'
import { useAdminCompose } from '@/store/compose'
import { adminPath } from '@/features/admin/paths'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: {
    adminComposeTip: '以管理员身份使用已配置的邮箱地址发信，不检查发信额度。草稿保存在当前浏览器会话中。',
    senderAddress: '发件邮箱',
    fromMailEmpty: '发件人地址不能为空',
    successSend: '请查看您的发件箱, 如果失败, 请检查稍后重试。',
  },
  en: {
    adminComposeTip: 'Send as admin from a configured email address; send balance is not checked. The draft stays in this browser session.',
    senderAddress: 'Sender address',
    fromMailEmpty: 'Sender address is empty',
    successSend: 'Please check your sendbox. If failed, please try again later.',
  },
})

const FROM_KEY = 'tm-admin-send-from'

/** `/console/send` — send a mail from any configured address via `/admin/send_mail`. */
export default function AdminSendMailPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const [fromMail, setFromMail] = useState(() => sessionStorage.getItem(FROM_KEY) || '')

  useEffect(() => {
    sessionStorage.setItem(FROM_KEY, fromMail)
  }, [fromMail])

  return (
    <ComposeForm
      notice={
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
          {t('adminComposeTip')}
        </p>
      }
      fromSlot={
        <Input
          type="email"
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
          value={fromMail}
          onChange={(e) => setFromMail(e.target.value)}
          placeholder={t('senderAddress')}
          aria-label={t('senderAddress')}
          autoComplete="off"
        />
      }
      onSend={async (payload) => {
        const from = fromMail.trim()
        if (!from) throw new Error(t('fromMailEmpty'))
        await api.post('/admin/send_mail', { ...payload, from_mail: from })
      }}
      store={useAdminCompose}
      sentHint={t('successSend')}
      onSent={() => {
        navigate(`${adminPath('sendbox')}?address=${encodeURIComponent(fromMail.trim())}`)
      }}
    />
  )
}
