import { SaveIcon, Undo2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/i18n'
import { settingsMessages } from './messages'

/** Primary Save button for the page header. Disabled while saving or when there is nothing to save. */
export function SaveButton({ dirty, saving, onSave }: { dirty: boolean; saving: boolean; onSave: () => void }) {
  const t = useT(settingsMessages)
  return (
    <Button onClick={onSave} disabled={!dirty || saving}>
      {saving ? <Spinner /> : <SaveIcon />}
      {t('save')}
    </Button>
  )
}

/**
 * Floating bar pinned to the bottom of the scrolling `Page` while there are unsaved changes.
 * Render it as the last child of `Page`.
 */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const t = useT(settingsMessages)
  if (!dirty) return null
  return (
    <div className="sticky bottom-0 z-10 -mx-1 animate-in pb-1 duration-200 fade-in slide-in-from-bottom-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t('unsavedChanges')}</p>
          <p className="text-xs text-muted-foreground">{t('unsavedChangesHint')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onDiscard} disabled={saving}>
            <Undo2Icon />
            {t('discard')}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Spinner /> : <SaveIcon />}
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
