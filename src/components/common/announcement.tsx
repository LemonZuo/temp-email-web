import { useEffect } from 'react'
import { MegaphoneIcon } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeHtml } from '@/lib/sanitize'
import { useApp } from '@/store/app'

const STORAGE_KEY = 'announcement'

/** Shows the site announcement once (or every load if `alwaysShowAnnouncement`). */
export function AnnouncementToast() {
  const { fetched, announcement, alwaysShowAnnouncement } = useApp((s) => s.openSettings)
  useEffect(() => {
    if (!fetched || !announcement) return
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen === announcement && !alwaysShowAnnouncement) return
    localStorage.setItem(STORAGE_KEY, announcement)
    toast(<div className="text-sm [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement) }} />, {
      icon: <MegaphoneIcon className="size-4" />,
      duration: 15_000,
      closeButton: true,
    })
  }, [fetched, announcement, alwaysShowAnnouncement])
  return null
}
