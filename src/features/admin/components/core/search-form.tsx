import { useState } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n'

/**
 * Search box that only applies its value on Enter / search button (server-side queries).
 * `value` is the applied query; the input keeps a local draft.
 */
export function SearchForm({
  value,
  onSearch,
  placeholder,
  className,
  inputClassName,
}: {
  value: string
  onSearch: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}) {
  const t = useT()
  const [draft, setDraft] = useState(value)
  const [applied, setApplied] = useState(value)

  // Follow external changes of the applied value (e.g. URL param)
  if (value !== applied) {
    setApplied(value)
    setDraft(value)
  }

  return (
    <form
      role="search"
      className={cn('min-w-0', className)}
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(draft.trim())
      }}
    >
      <InputGroup className={inputClassName}>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder || t('search')}
          aria-label={placeholder || t('search')}
        />
        <InputGroupAddon align="inline-end">
          {draft && (
            <InputGroupButton
              size="icon-xs"
              aria-label={t('reset')}
              onClick={() => {
                setDraft('')
                if (value) onSearch('')
              }}
            >
              <XIcon />
            </InputGroupButton>
          )}
          <InputGroupButton type="submit" variant="secondary" size="xs">
            {t('query')}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
