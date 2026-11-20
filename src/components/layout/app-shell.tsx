import { useEffect, useState } from 'react'
import { NavLink, useLocation, matchPath } from 'react-router'
import { ChevronRightIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, type LucideIcon } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { ModuleSwitcher, type ModuleKey } from './module-switcher'
import { LanguageToggle, ThemeToggle } from './header-controls'
import { SidebarFooterLinks } from './sidebar-footer-links'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { collapseSidebar: '收起菜单', expandSidebar: '展开菜单' },
  en: { collapseSidebar: 'Collapse sidebar', expandSidebar: 'Expand sidebar' },
})

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  badge?: React.ReactNode
  /** Only active on exact match (default true) */
  end?: boolean
  hidden?: boolean
}
export type NavGroup = { label?: string; items: NavItem[]; hidden?: boolean }

const isItemActive = (item: NavItem, pathname: string) =>
  !!matchPath({ path: item.url, end: item.end !== false }, pathname)

/** Collapsed nav groups, persisted per module: `{ "admin:3": true }` (key = module + index in its nav). */
const COLLAPSED_STORAGE_KEY = 'tm-nav-collapsed'
type CollapsedGroups = Record<string, boolean>

const readCollapsed = (): CollapsedGroups => {
  try {
    const value = JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

/** Keys of the groups that contain the current page (they are expanded on navigation). */
const activeGroupKeys = (module: string, groups: NavGroup[], pathname: string) =>
  groups.flatMap((g, gi) => (g.items.some((i) => !i.hidden && isItemActive(i, pathname)) ? [`${module}:${gi}`] : []))

function NavMenu({ module, groups }: { module: ModuleKey; groups: NavGroup[] }) {
  const { pathname } = useLocation()
  const { state, isMobile } = useSidebar()
  const iconMode = state === 'collapsed' && !isMobile
  const [collapsed, setCollapsed] = useState<CollapsedGroups>(() => {
    const stored = readCollapsed()
    for (const key of activeGroupKeys(module, groups, pathname)) delete stored[key]
    return stored
  })
  const update = (next: CollapsedGroups) => {
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
  }

  // Navigating into a collapsed group (link, back button, logo tap ...) expands it.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    const keys = activeGroupKeys(module, groups, pathname).filter((k) => collapsed[k])
    if (keys.length) {
      const next = { ...collapsed }
      for (const key of keys) delete next[key]
      update(next)
    }
  }

  // Long navs (admin) scroll: keep the active entry visible, e.g. after a deep link or reload.
  useEffect(() => {
    document
      .querySelector('[data-slot="sidebar-content"] [data-slot="sidebar-menu-button"][data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  return (
    <>
      {groups.map((group, gi) => {
        if (group.hidden || !group.items.some((i) => !i.hidden)) return null
        const key = `${module}:${gi}`
        // Unlabelled groups can't be folded; in icon mode the labels are hidden, so show every item.
        const open = !group.label || iconMode || !collapsed[key]
        return (
          <Collapsible
            key={group.label || gi}
            asChild
            open={open}
            onOpenChange={(o) => {
              const next = { ...collapsed }
              if (o) delete next[key]
              else next[key] = true
              update(next)
            }}
            className="group/collapsible"
          >
            <SidebarGroup className="data-[state=closed]:py-0">
              {group.label && (
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="w-full cursor-pointer gap-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <span className="flex-1 truncate text-left">{group.label}</span>
                    <ChevronRightIcon className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
              )}
              <CollapsibleContent>
                <SidebarMenu>
                  {group.items
                    .filter((i) => !i.hidden)
                    .map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isItemActive(item, pathname)} tooltip={item.title}>
                          <NavLink to={item.url} end={item.end !== false}>
                            <item.icon />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                        {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )
      })}
    </>
  )
}

/** Wide (icons + labels) / narrow (icons only) sidebar, persisted in this browser. */
const SIDEBAR_OPEN_KEY = 'tm-sidebar-open'
const readSidebarOpen = () => localStorage.getItem(SIDEBAR_OPEN_KEY) !== '0'
const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘B' : 'Ctrl+B'

/** Desktop toggle between the wide and the narrow (icon) sidebar; on mobile the header trigger opens the sheet. */
function SidebarWidthToggle() {
  const t = useT(messages)
  const { open, toggleSidebar, isMobile } = useSidebar()
  if (isMobile) return null
  const label = open ? t('collapseSidebar') : t('expandSidebar')
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={toggleSidebar} tooltip={`${label} (${SHORTCUT})`} className="text-sidebar-foreground/70">
          {open ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
          <span>{label}</span>
          <Kbd className="ml-auto">{SHORTCUT}</Kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** Closes the mobile sidebar sheet after navigation. */
function CloseMobileOnNavigate() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile])
  return null
}

function CurrentTitle({ groups }: { groups: NavGroup[] }) {
  const { pathname } = useLocation()
  const item = groups.flatMap((g) => g.items).find((i) => isItemActive(i, pathname))
  return <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{item?.title}</h1>
}

/**
 * Application frame: collapsible sidebar (module switcher + nav) and an inset content panel
 * with a slim header. Children fill the remaining height; pages handle their own scrolling.
 */
export function AppShell({
  module,
  nav,
  sidebarTop,
  sidebarBottom,
  headerActions,
  children,
}: {
  module: ModuleKey
  nav: NavGroup[]
  /** Extra content above the nav (e.g. compose button) */
  sidebarTop?: React.ReactNode
  /** Extra content in the footer above the links (e.g. account info) */
  sidebarBottom?: React.ReactNode
  headerActions?: React.ReactNode
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  return (
    <SidebarProvider
      className="h-svh"
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarOpen(open)
        localStorage.setItem(SIDEBAR_OPEN_KEY, open ? '1' : '0')
      }}
    >
      <CloseMobileOnNavigate />
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <ModuleSwitcher current={module} />
        </SidebarHeader>
        <SidebarContent>
          {sidebarTop}
          <NavMenu module={module} groups={nav} />
        </SidebarContent>
        <SidebarFooter>
          {sidebarBottom}
          <SidebarWidthToggle />
          <SidebarFooterLinks />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          {/* desktop uses the toggle at the bottom of the sidebar; on mobile this opens the sidebar sheet */}
          <SidebarTrigger className="-ml-1 size-9 md:hidden" />
          <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center md:hidden" />
          <CurrentTitle groups={nav} />
          <div className="flex items-center gap-1">
            {headerActions}
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <div className="relative min-h-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
