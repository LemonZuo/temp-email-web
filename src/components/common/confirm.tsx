import { create } from 'zustand'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useT } from '@/i18n'

type ConfirmOptions = {
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

type ConfirmState = {
  open: boolean
  options: ConfirmOptions
  resolve: ((v: boolean) => void) | null
}

const useConfirmStore = create<ConfirmState>(() => ({ open: false, options: {}, resolve: null }))

/**
 * Imperative confirm dialog: `if (await confirm({ title, destructive: true })) ...`
 * Requires <ConfirmHost /> mounted once (done in App).
 */
export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().resolve?.(false)
    useConfirmStore.setState({ open: true, options, resolve })
  })
}

export function ConfirmHost() {
  const { open, options, resolve } = useConfirmStore()
  const t = useT()
  const close = (value: boolean) => {
    resolve?.(value)
    useConfirmStore.setState({ open: false, resolve: null })
  }
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title || t('areYouSure')}</AlertDialogTitle>
          {options.description !== undefined && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{options.cancelText || t('cancel')}</AlertDialogCancel>
          <AlertDialogAction variant={options.destructive ? 'destructive' : 'default'} onClick={() => close(true)}>
            {options.confirmText || t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
