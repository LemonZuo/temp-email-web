import { Spinner } from '@/components/ui/spinner'

export function RouteFallback() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-muted-foreground">
      <Spinner className="size-6" />
    </div>
  )
}

export function FullScreenFallback() {
  return (
    <div className="flex h-svh items-center justify-center text-muted-foreground">
      <Spinner className="size-8" />
    </div>
  )
}
