import { useState } from 'react'
import { KeyRoundIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { PasswordInput } from '@/components/common/password-input'
import { errorMessage } from '@/lib/format'
import { useT } from '@/i18n'

/**
 * Asks for a new password. `onSubmit` receives the plain (trimmed when `trim`) password;
 * the caller hashes it. Closes and toasts `successText` on success.
 */
export function PasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  submitText,
  successText,
  emptyText,
  trim = false,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  label: string
  submitText: string
  successText?: string
  /** Error shown when the password is empty */
  emptyText: string
  trim?: boolean
  onSubmit: (password: string) => Promise<unknown>
}) {
  const t = useT()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)

  // Start empty every time the dialog opens
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPassword('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = trim ? password.trim() : password
    if (!value) return toast.error(emptyText)
    setLoading(true)
    try {
      await onSubmit(value)
      toast.success(successText || t('success'))
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription className="break-all">{description}</DialogDescription>}
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-new-password">{label}</FieldLabel>
              <PasswordInput
                id="admin-new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <KeyRoundIcon />}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
