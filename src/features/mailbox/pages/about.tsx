import { ExternalLinkIcon, MegaphoneIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, Section } from '@/components/common/page'
import { APP_CONFIG } from '@/lib/config'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { title: '关于', announcement: '公告', community: '项目与社区', version: '版本', frontend: '前端', backend: '后端' },
  en: { title: 'About', announcement: 'Announcement', community: 'Project & community', version: 'Version', frontend: 'Frontend', backend: 'Backend' },
})

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/dreamhunter2333/cloudflare_temp_email' },
  { label: 'Discord', href: 'https://discord.gg/dQEwTWhA6Q' },
  { label: 'Telegram', href: 'https://t.me/cloudflare_temp_email' },
]

/** `/about` (enabled by ENABLE_INDEX_ABOUT) */
export default function AboutPage() {
  const t = useT(messages)
  const { title, announcement, version } = useApp((s) => s.openSettings)
  return (
    <Page>
      <PageHeader title={t('title')} description={title} />
      {announcement && (
        <Section title={t('announcement')} actions={<MegaphoneIcon className="size-4 text-muted-foreground" />}>
          <div className="prose-sm text-sm leading-relaxed [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement) }} />
        </Section>
      )}
      <Section title={t('community')}>
        <div className="flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <Button key={l.href} variant="outline" asChild>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.label}
                <ExternalLinkIcon />
              </a>
            </Button>
          ))}
        </div>
      </Section>
      <Section title={t('version')}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t('frontend')}</dt>
          <dd className="font-mono">{APP_CONFIG.VERSION ? `v${APP_CONFIG.VERSION}` : '-'}</dd>
          <dt className="text-muted-foreground">{t('backend')}</dt>
          <dd className="font-mono">{version || '-'}</dd>
        </dl>
      </Section>
    </Page>
  )
}
