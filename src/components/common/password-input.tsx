import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'

export function PasswordInput(props: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <InputGroup>
      <InputGroupInput type={show ? 'text' : 'password'} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" onClick={() => setShow((s) => !s)} aria-label={show ? 'hide' : 'show'}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
