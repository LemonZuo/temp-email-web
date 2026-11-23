import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

/**
 * Keeps a real password field away from password managers. Chrome ignores `autocomplete="off"` on password
 * fields, but skips one-time-code fields both when filling and when offering to save; the data attributes do the
 * same for 1Password, LastPass, Bitwarden and Dashlane.
 */
const NO_AUTOFILL = {
  autoComplete: 'one-time-code',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-bwignore': true,
  'data-form-type': 'other',
} as const

type Props = Omit<React.ComponentProps<'input'>, 'type'> & {
  /** No saved-password suggestions and no "save password?" prompt (shared secrets such as the site / admin password) */
  noAutofill?: boolean
}

export function PasswordInput({ noAutofill = false, ...props }: Props) {
  const [show, setShow] = useState(false)
  return (
    <InputGroup>
      <InputGroupInput type={show ? 'text' : 'password'} {...props} {...(noAutofill ? NO_AUTOFILL : {})} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" onClick={() => setShow((s) => !s)} aria-label={show ? 'hide' : 'show'}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
