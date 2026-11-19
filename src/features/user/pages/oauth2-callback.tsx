import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { CircleAlertIcon, LogInIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/format'
import { defineMessages, useT } from '@/i18n'
import { AuthShell } from '../components/auth-shell'
import { completeUserLogin, oauth2Session } from '../session'

const messages = defineMessages({
  zh: {
    logging: '登录中...',
    loggingDesc: '正在验证第三方登录信息，请稍候',
    failed: '登录失败',
    stateNotMatch: 'state 不匹配',
    codeNotFound: '未找到授权码',
    backToLogin: '返回登录',
  },
  en: {
    logging: 'Logging in...',
    loggingDesc: 'Verifying your sign-in with the provider, please wait',
    failed: 'Login failed',
    stateNotMatch: 'state not match',
    codeNotFound: 'code not found',
    backToLogin: 'Back to login',
  },
})

/** `/user/oauth2/callback` — exchanges the provider `code` for a user JWT, then opens `/user`. */
export default function Oauth2CallbackPage() {
  const t = useT(messages)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  // The code can only be exchanged once; guard against StrictMode / re-renders running it twice.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const state = searchParams.get('state')
    const code = searchParams.get('code')
    const providerError = searchParams.get('error_description') || searchParams.get('error')
    const saved = oauth2Session.get()
    const run = async () => {
      try {
        if (!saved.state || state !== saved.state) throw new Error(t('stateNotMatch'))
        if (!code) throw new Error(providerError || t('codeNotFound'))
        const res = await api.post<{ jwt: string }>('/user_api/oauth2/callback', { code, clientID: saved.clientID })
        await completeUserLogin(res.jwt)
        navigate('/user', { replace: true })
      } catch (err) {
        console.error(err)
        const msg = errorMessage(err)
        setError(msg)
        toast.error(msg)
      } finally {
        oauth2Session.clear()
      }
    }
    void run()
  }, [searchParams, navigate, t])

  return (
    <AuthShell>
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          {error ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <CircleAlertIcon className="size-6" />
              </div>
              <div className="grid gap-1">
                <h1 className="text-lg font-semibold">{t('failed')}</h1>
                <p className="text-sm break-all text-muted-foreground">{error}</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/user', { replace: true })}>
                <LogInIcon />
                {t('backToLogin')}
              </Button>
            </>
          ) : (
            <>
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Spinner className="size-6" />
              </div>
              <div className="grid gap-1">
                <h1 className="text-lg font-semibold">{t('logging')}</h1>
                <p className="text-sm text-muted-foreground">{t('loggingDesc')}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
