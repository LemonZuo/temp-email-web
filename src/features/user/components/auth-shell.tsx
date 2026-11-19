import { Link } from 'react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/layout/module-switcher'
import { LanguageToggle, ThemeToggle } from '@/components/layout/header-controls'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { defaultTitle: '临时邮箱', backToMailbox: '返回邮箱' },
  en: { defaultTitle: 'Temp Email', backToMailbox: 'Back to mailbox' },
})

const YEAR = new Date().getFullYear()

/** Full-screen frame for the user login / OAuth2 callback screens. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useT(messages)
  const title = useApp((s) => s.openSettings.title) || t('defaultTitle')
  const copyright = useApp((s) => s.openSettings.copyright)
  return (
    <div className="relative flex min-h-svh flex-col overflow-y-auto bg-muted/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 px-4 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold">
          <Logo className="size-7" />
          <span className="truncate">{title}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="relative flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
        {children}
        <Button variant="link" size="sm" className="text-muted-foreground" asChild>
          <Link to="/">
            <ArrowLeftIcon />
            {t('backToMailbox')}
          </Link>
        </Button>
      </main>
      {copyright && (
        <footer className="relative shrink-0 py-4 text-center text-xs text-muted-foreground">
          © {YEAR} {copyright}
        </footer>
      )}
    </div>
  )
}
