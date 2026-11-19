import { SearchForm } from './search-form'

/** Compact address filter for workspace list headers. */
export function AddressFilter({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return <SearchForm value={value} onSearch={onChange} placeholder={placeholder} inputClassName="h-8" />
}
