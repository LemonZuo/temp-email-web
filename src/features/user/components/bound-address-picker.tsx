import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronsUpDownIcon, MailsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { api, type ListResponse } from '@/lib/api'
import { cn } from '@/lib/utils'
import { defineMessages, useT } from '@/i18n'
import { isValidAddressQuery, type BoundAddress } from '../session'

const messages = defineMessages({
  zh: {
    allAddresses: '全部邮箱地址',
    placeholder: '选择邮箱地址',
    search: '搜索邮箱地址',
    empty: '没有匹配的邮箱地址',
    invalidQuery: '搜索词最长 100 个字符，且不能包含 % 或 _',
    more: '仅显示前 {n} 个结果，请输入关键字筛选',
  },
  en: {
    allAddresses: 'All addresses',
    placeholder: 'Select an address',
    search: 'Search addresses',
    empty: 'No matching addresses',
    invalidQuery: 'Search term must be at most 100 characters and cannot contain % or _',
    more: 'Showing the first {n} results, type to narrow down',
  },
})

const PAGE = 100

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

/**
 * Searchable picker over the user's bound addresses (`/user_api/bind_address`, server-side search,
 * so it works for any number of addresses). `value` is the selected address name.
 */
export function BoundAddressPicker({
  value,
  onChange,
  allowAll,
  className,
  variant = 'outline',
}: {
  value: string
  onChange: (address: BoundAddress | null) => void
  /** Adds an "All addresses" entry that selects `null` */
  allowAll?: boolean
  className?: string
  variant?: 'outline' | 'ghost'
}) {
  const t = useT(messages)
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const query = useDebounced(keyword.trim())
  const valid = isValidAddressQuery(query)

  const list = useQuery({
    queryKey: ['user', 'bind_address', 'picker', query],
    queryFn: () =>
      api.get<ListResponse<BoundAddress>>(
        `/user_api/bind_address?limit=${PAGE}&offset=0${query ? `&query=${encodeURIComponent(query)}` : ''}`,
      ),
    enabled: open && valid,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  const rows = list.data?.results || []
  const total = list.data?.count || 0

  const select = (address: BoundAddress | null) => {
    onChange(address)
    setOpen(false)
    setKeyword('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          role="combobox"
          aria-expanded={open}
          className={cn('min-w-0 justify-between gap-2 font-normal', className)}
        >
          <MailsIcon className="text-muted-foreground" />
          <span className={cn('min-w-0 flex-1 truncate text-left', value ? 'font-mono text-xs' : 'text-muted-foreground')}>
            {value || (allowAll ? t('allAddresses') : t('placeholder'))}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={keyword} onValueChange={setKeyword} placeholder={t('search')} />
          <CommandList>
            {!valid ? (
              <div className="px-3 py-6 text-center text-sm text-destructive">{t('invalidQuery')}</div>
            ) : list.isLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Spinner />
              </div>
            ) : (
              <>
                <CommandEmpty>{t('empty')}</CommandEmpty>
                {allowAll && !query && (
                  <CommandGroup>
                    <CommandItem value="__all__" data-checked={!value} onSelect={() => select(null)}>
                      {t('allAddresses')}
                    </CommandItem>
                  </CommandGroup>
                )}
                {rows.length > 0 && (
                  <CommandGroup>
                    {rows.map((row) => (
                      <CommandItem
                        key={row.id}
                        value={`${row.id}`}
                        data-checked={row.name === value}
                        onSelect={() => select(row)}
                      >
                        <span className="min-w-0 truncate font-mono text-xs">{row.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {total > rows.length && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">{t('more', { n: rows.length })}</div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
