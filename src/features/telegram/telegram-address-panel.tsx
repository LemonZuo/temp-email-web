/** Telegram Mini App: address picker shown on the mailbox landing when opened inside Telegram. */
export function TelegramAddressPanel() {
  return <div className="text-sm text-muted-foreground">Telegram</div>
}

export const isTelegramWebApp = () =>
  typeof window !== 'undefined' &&
  !!(window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData
