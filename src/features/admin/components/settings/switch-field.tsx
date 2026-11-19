import { useId } from 'react'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'

/** A label + description row with a switch on the right. */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  children,
}: {
  id?: string
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Extra content under the description (badges, hints...). */
  children?: React.ReactNode
}) {
  const autoId = useId()
  const switchId = id ?? autoId
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={switchId}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
        {children}
      </FieldContent>
      <Switch id={switchId} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </Field>
  )
}
