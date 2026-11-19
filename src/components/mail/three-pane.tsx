import { useIsMobile } from '@/hooks/use-mobile'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { usePrefs } from '@/store/prefs'

/**
 * List + reader split used by inbox / sendbox screens (the sidebar is the third pane).
 * On mobile only one pane is visible: the reader replaces the list when something is open.
 */
export function ThreePane({ list, reader, hasSelection }: { list: React.ReactNode; reader: React.ReactNode; hasSelection: boolean }) {
  const isMobile = useIsMobile()
  const listPaneSize = usePrefs((s) => s.listPaneSize)
  if (isMobile) {
    return <div className="flex h-full min-h-0 flex-col">{hasSelection ? reader : list}</div>
  }
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full"
      onLayoutChanged={(layout) => {
        const first = layout.list
        if (typeof first === 'number' && Math.abs(first - listPaneSize) > 0.5) usePrefs.getState().set({ listPaneSize: first })
      }}
    >
      <ResizablePanel id="list" defaultSize={`${listPaneSize}%`} minSize="24%" maxSize="60%" className="flex min-h-0 flex-col">
        {list}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="reader" minSize="30%" className="flex min-h-0 flex-col">
        {reader}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
