import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { copyText } from '@/lib/clipboard'
import { useT } from '@/i18n'

type Props = Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  value: string
  /** Show text label next to the icon */
  label?: string | boolean
}

export function CopyButton({ value, label, variant = 'ghost', size, ...props }: Props) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    if (await copyText(value)) {
      setCopied(true)
      toast.success(t('copied'))
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast.error(t('copyFailed'))
    }
  }
  const text = label === true ? t('copy') : label || ''
  const icon = copied ? <CheckIcon /> : <CopyIcon />
  const button = (
    <Button type="button" variant={variant} size={size ?? (text ? 'sm' : 'icon-sm')} onClick={onCopy} {...props}>
      {icon}
      {text}
    </Button>
  )
  if (text) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{t('copy')}</TooltipContent>
    </Tooltip>
  )
}
