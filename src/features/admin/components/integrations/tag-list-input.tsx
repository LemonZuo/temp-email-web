import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'

const messages = defineMessages({
  zh: { removeItem: '移除 {item}', clearAll: '清空', count: '{n} 项' },
  en: { removeItem: 'Remove {item}', clearAll: 'Clear', count: '{n} total' },
})

/**
 * Free-form list editor (chips). Enter, comma, Tab or paste adds items; Backspace on an empty
 * input removes the last one. Values are trimmed and de-duplicated.
 */
export function TagListInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  mono = true,
  className,
}: {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  mono?: boolean
  className?: string
}) {
  const t = useT(messages)
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const items = raw
      .split(/[\s,;，；]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (!items.length) return false
    const next = [...value]
    for (const item of items) if (!next.includes(item)) next.push(item)
    if (next.length !== value.length) onChange(next)
    return true
  }

  const commit = () => {
    if (add(draft)) setDraft('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && draft.trim())) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div
        className={cn(
          'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
          disabled && 'pointer-events-none opacity-50',
        )}
        onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
      >
        {value.map((item) => (
          <span
            key={item}
            className={cn(
              'inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-secondary pr-0.5 pl-2 text-xs text-secondary-foreground',
              mono && 'font-mono',
            )}
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={t('removeItem', { item })}
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((x) => x !== item))
              }}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder={value.length ? undefined : placeholder}
          className="h-6 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (/[\s,;，；]/.test(text.trim())) {
              e.preventDefault()
              add(draft + text)
              setDraft('')
            }
          }}
        />
      </div>
      {value.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('count', { n: value.length })}</span>
          <button type="button" className="hover:text-foreground hover:underline" disabled={disabled} onClick={() => onChange([])}>
            {t('clearAll')}
          </button>
        </div>
      )}
    </div>
  )
}
