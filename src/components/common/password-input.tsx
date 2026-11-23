import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

/**
 * Keeps a real password field away from saved logins. Chrome ignores `autocomplete="off"` on password fields and
 * still listed saved accounts on a `one-time-code` field; `new-password` stops it from filling saved passwords
 * (it may offer to generate one instead). The data attributes do the same for 1Password, LastPass, Bitwarden and
 * Dashlane.
 */
const NO_AUTOFILL = {
  autoComplete: 'new-password',
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
