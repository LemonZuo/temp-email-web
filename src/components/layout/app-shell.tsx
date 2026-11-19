import { useEffect } from 'react'
import { NavLink, useLocation, matchPath } from 'react-router'
import type { LucideIcon } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { ModuleSwitcher, type ModuleKey } from './module-switcher'
import { LanguageToggle, ThemeToggle } from './header-controls'
import { SidebarFooterLinks } from './sidebar-footer-links'

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

function NavMenu({ groups }: { groups: NavGroup[] }) {
  const { pathname } = useLocation()
  return (
    <>
      {groups
        .filter((g) => !g.hidden && g.items.some((i) => !i.hidden))
        .map((group, gi) => (
          <SidebarGroup key={group.label || gi}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
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
          </SidebarGroup>
        ))}
    </>
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
  return (
    <SidebarProvider className="h-svh">
      <CloseMobileOnNavigate />
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <ModuleSwitcher current={module} />
        </SidebarHeader>
        <SidebarContent>
          {sidebarTop}
          <NavMenu groups={nav} />
        </SidebarContent>
        <SidebarFooter>
          {sidebarBottom}
          <SidebarFooterLinks />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-0 overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
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
