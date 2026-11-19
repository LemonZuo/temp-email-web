/** Subset of `window.Telegram.WebApp` (https://core.telegram.org/bots/webapps) used by the mini app. */
export type TelegramWebApp = {
  initData?: string
}

export const getTelegramWebApp = (): TelegramWebApp | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp

/** Signed init data the worker verifies (`checkTelegramAuth`); empty outside Telegram. */
export const getTelegramInitData = (): string => getTelegramWebApp()?.initData || ''

/** True when running inside the Telegram Mini App (signed `initData` is available). */
export const isTelegramWebApp = () => !!getTelegramInitData()
