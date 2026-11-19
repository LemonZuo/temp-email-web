import { useState } from 'react'
import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'defaultValue'> & {
  value: number | null | undefined
  /** Receives `null` when the input is cleared. Intermediate text such as `-` is kept locally. */
  onChange: (value: number | null) => void
}

const toText = (value: number | null | undefined) => (value === null || value === undefined || Number.isNaN(value) ? '' : String(value))

/** Numeric input that keeps a nullable number in state without fighting the user's typing. */
export function NumberInput({ value, onChange, onBlur, ...props }: Props) {
  const [text, setText] = useState(() => toText(value))
  const [synced, setSynced] = useState(value)

  // External value changed (load / reset / discard): show it.
  if (value !== synced) {
    setSynced(value)
    const current = text.trim() === '' ? null : Number(text)
    if (current !== value) setText(toText(value))
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        if (raw.trim() === '') {
          setSynced(null)
          onChange(null)
          return
        }
        const parsed = Number(raw)
        if (Number.isFinite(parsed)) {
          setSynced(parsed)
          onChange(parsed)
        }
      }}
      onBlur={(e) => {
        setText(toText(value))
        onBlur?.(e)
      }}
      {...props}
    />
  )
}
