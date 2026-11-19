import { useRef } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { usePrefs } from '@/store/prefs'

/**
 * List + reader split used by inbox / sendbox screens (the sidebar is the third pane).
 * The list keeps a pixel width (dragging the handle changes and remembers it); extra room goes to the reader.
 * On mobile only one pane is visible: the reader replaces the list when something is open.
 */
export function ThreePane({ list, reader, hasSelection }: { list: React.ReactNode; reader: React.ReactNode; hasSelection: boolean }) {
  const isMobile = useIsMobile()
  const listPaneWidth = usePrefs((s) => s.listPaneWidth)
  const width = useRef(listPaneWidth)
  if (isMobile) {
    return <div className="flex h-full min-h-0 flex-col">{hasSelection ? reader : list}</div>
  }
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-full"
      onLayoutChanged={() => {
        const next = Math.round(width.current)
        if (Math.abs(next - usePrefs.getState().listPaneWidth) > 1) usePrefs.getState().set({ listPaneWidth: next })
      }}
    >
      <ResizablePanel
        id="list"
        defaultSize={`${listPaneWidth}px`}
        minSize="280px"
        maxSize="60%"
        groupResizeBehavior="preserve-pixel-size"
        onResize={(size) => {
          width.current = size.inPixels
        }}
        className="flex min-h-0 flex-col"
      >
        {list}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel id="reader" minSize="30%" className="flex min-h-0 flex-col">
        {reader}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
