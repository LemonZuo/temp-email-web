import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

/** Browsers that can mask a plain text field; elsewhere `noAutofill` falls back to a real password field. */
const canMaskText = typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc')

/** Tells password managers (1Password, LastPass, Bitwarden, Dashlane) to leave the field alone. */
const IGNORE_MANAGERS = { 'data-1p-ignore': true, 'data-lpignore': 'true', 'data-bwignore': true, 'data-form-type': 'other' }

type Props = Omit<React.ComponentProps<'input'>, 'type'> & {
  /**
   * Keep the browser from offering saved passwords (and from asking to save one). Chrome ignores
   * `autocomplete="off"` on password fields, so the field is a text input masked with `-webkit-text-security`.
   * For shared secrets such as the site / admin password, not for account logins.
   */
  noAutofill?: boolean
}

export function PasswordInput({ noAutofill = false, style, ...props }: Props) {
  const [show, setShow] = useState(false)
  const masked = noAutofill && canMaskText
  const input = masked
    ? {
        type: 'text',
        autoComplete: 'off',
        autoCorrect: 'off',
        autoCapitalize: 'off',
        spellCheck: false,
        ...IGNORE_MANAGERS,
        style: { ...style, WebkitTextSecurity: show ? 'none' : 'disc' } as React.CSSProperties,
      }
    : { type: show ? 'text' : 'password', style, ...(noAutofill ? { autoComplete: 'off', ...IGNORE_MANAGERS } : {}) }
  return (
    <InputGroup>
      <InputGroupInput {...props} {...input} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" onClick={() => setShow((s) => !s)} aria-label={show ? 'hide' : 'show'}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
