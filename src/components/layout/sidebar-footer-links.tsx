import { ActivityIcon } from 'lucide-react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { APP_CONFIG } from '@/lib/config'
import { useApp, useFlags } from '@/store/app'
import { defineMessages, useT } from '@/i18n'

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

const messages = defineMessages({
  zh: { status: '服务状态', github: 'GitHub' },
  en: { status: 'Status', github: 'GitHub' },
})

export function SidebarFooterLinks() {
  const t = useT(messages)
  const openSettings = useApp((s) => s.openSettings)
  const { showAdminPage } = useFlags()
  const showGithub = openSettings.showGithub && (openSettings.showGithubForUser || showAdminPage)
  const version = APP_CONFIG.VERSION ? `v${APP_CONFIG.VERSION}` : ''
  return (
    <SidebarMenu>
      {openSettings.statusUrl && (
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="sm" tooltip={t('status')}>
            <a href={openSettings.statusUrl} target="_blank" rel="noreferrer">
              <ActivityIcon />
              <span>{t('status')}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {showGithub && (
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="sm" tooltip={t('github')}>
            <a href="https://github.com/dreamhunter2333/cloudflare_temp_email" target="_blank" rel="noreferrer">
              <GithubIcon />
              <span>{t('github')}</span>
              {version && <span className="ml-auto text-xs text-muted-foreground">{version}</span>}
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      <div className="px-2 pt-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
        © {new Date().getFullYear()} {openSettings.copyright}
      </div>
    </SidebarMenu>
  )
}
