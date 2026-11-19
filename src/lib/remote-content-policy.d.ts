/**
 * Sanitizes a mail body with DOMPurify and, unless `allowRemoteImages` is set, strips every
 * reference that could hit the network (img src, srcset, CSS url(), @import ...).
 * `blocked` counts how many references were removed.
 */
export function blockRemoteContent(
  html: string,
  options?: { allowRemoteImages?: boolean },
): { html: string; blocked: number }
