import { useMemo, useRef, useState } from 'react'
import { CornerDownLeftIcon, XIcon } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'
import { settingsMessages } from './messages'

export type StringListSuggestion = { value: string; label?: string }

type Props = {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Optional picklist shown while typing (values can still be entered freely). */
  suggestions?: (string | StringListSuggestion)[]
  disabled?: boolean
  /** Render items in a monospace font (regex / IP patterns). */
  mono?: boolean
  /** Items that should be highlighted as invalid. */
  invalidItems?: string[]
  'aria-label'?: string
  'aria-invalid'?: boolean
  className?: string
}

/**
 * Free-form string list editor ("tags" input): Enter adds, Backspace on an empty input removes the last item,
 * pasting multiple lines adds one item per line, and pending text is committed on blur.
 */
export function StringListInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  disabled,
  mono,
  invalidItems,
  className,
  ...aria
}: Props) {
  const t = useT(settingsMessages)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const options = useMemo(
    () => (suggestions ?? []).map((s) => (typeof s === 'string' ? { value: s, label: s } : { value: s.value, label: s.label || s.value })),
    [suggestions],
  )
  const query = text.trim().toLowerCase()
  const filtered = options.filter(
    (o) => !value.includes(o.value) && (!query || o.value.toLowerCase().includes(query) || o.label.toLowerCase().includes(query)),
  )
  const open = focused && !dismissed && !disabled && filtered.length > 0

  const add = (items: string[]) => {
    const next = [...value]
    for (const raw of items) {
      const item = raw.trim()
      if (item && !next.includes(item)) next.push(item)
    }
    if (next.length !== value.length) onChange(next)
    setText('')
    setHighlight(-1)
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (open && highlight >= 0 && filtered[highlight]) add([filtered[highlight].value])
      else if (text.trim()) add([text])
    } else if (e.key === 'Backspace' && !text && value.length > 0) {
      remove(value.length - 1)
    } else if (e.key === 'ArrowDown' && filtered.length > 0) {
      e.preventDefault()
      setDismissed(false)
      setHighlight((h) => (h + 1) % filtered.length)
    } else if (e.key === 'ArrowUp' && filtered.length > 0) {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? filtered.length - 1 : h - 1))
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setDismissed(true)
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!/[\r\n]/.test(pasted)) return
    e.preventDefault()
    add([text, ...pasted.split(/\r?\n/)])
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true)
      }}
    >
      <PopoverAnchor asChild>
        <div
          ref={containerRef}
          data-disabled={disabled || undefined}
          aria-invalid={aria['aria-invalid'] || undefined}
          className={cn(
            'flex min-h-8 w-full min-w-0 cursor-text flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-sm transition-colors',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
            'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
            'data-disabled:cursor-not-allowed data-disabled:bg-input/50 data-disabled:opacity-50',
            className,
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((item, index) => {
            const invalid = invalidItems?.includes(item)
            return (
              <span
                key={`${item}-${index}`}
                className={cn(
                  'inline-flex h-6 max-w-full min-w-0 items-center gap-0.5 rounded-md bg-secondary pr-0.5 pl-2 text-xs text-secondary-foreground',
                  mono && 'font-mono',
                  invalid && 'bg-destructive/10 text-destructive',
                )}
              >
                <span className="truncate" title={item}>
                  {item}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={t('removeItem', { item })}
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(index)
                    }}
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </span>
            )
          })}
          <input
            ref={inputRef}
            id={id}
            value={text}
            disabled={disabled}
            aria-label={aria['aria-label']}
            aria-invalid={aria['aria-invalid']}
            placeholder={value.length === 0 ? placeholder || t('manualInputPrompt') : undefined}
            className={cn(
              'h-6 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm',
              mono && 'font-mono',
            )}
            onChange={(e) => {
              setText(e.target.value)
              setDismissed(false)
              setHighlight(-1)
            }}
            onFocus={() => {
              setFocused(true)
              setDismissed(false)
            }}
            onBlur={() => {
              setFocused(false)
              if (text.trim()) add([text])
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
          {text.trim() && (
            <Kbd className="mr-0.5 hidden sm:inline-flex">
              <CornerDownLeftIcon />
            </Kbd>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-64 w-(--radix-popover-trigger-width) min-w-48 gap-0 overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (containerRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
      >
        <div className="px-2 py-1 text-xs text-muted-foreground">{t('suggestions')}</div>
        {filtered.map((option, index) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted',
              index === highlight && 'bg-muted',
            )}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setHighlight(index)}
            onClick={() => add([option.value])}
          >
            <span className="truncate">{option.label}</span>
            {option.label !== option.value && <span className="truncate text-xs text-muted-foreground">{option.value}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
